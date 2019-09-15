class Element {
  constructor(tag, attributes, children) {
    this.tag = tag;
    this.attributes = attributes;
    this.children = children;
  }
}

class Text {
  constructor(text) {
    this.text = text;
  }
}

class Model {
  constructor(props) {
    Object.keys(props).forEach((k) => {
      this[k] = props[k];
    });
  }

  isBind(text) {
    return /^{.*}$/.test(text);
  }

  evalText(text, variables) {
    if (this.isBind(text)) {
      // TODO: impl
      const script = text.substring(1, text.length-1);
      if (variables[script]) {
        return variables[script];
      }
      return eval(script);
    }
    return text;
  }

  evalHandler(text, variables) {
    if (this.isBind(text)) {
      // TODO: impl
      const script = text.substring(1, text.length-1);
      return (e) => {
        this[script].bind(this)(e);
      }
    }
    console.error('no bounded');
  }

  set(k, v) {
    this[k] = v;
  }
}

class MyVue {
  constructor(props) {
    this.model = new Model(props.model);
    this.selector = props.selector;
    this.methods = props.methods;
    this.el = document.querySelector(this.selector);
    this.template = this.createTemplate(this.el);
    this.render()
  }

  createVDOM(template) {
    const variables = Object.keys(this.model).reduce((prev, key) => {
      prev[key] = this.model[key];
      return prev;
    }, {});
    const creator = new VDOMCreator(this.model);
    return creator.create(template, variables);
  }

  render() {
    const newVDOM = this.createVDOM(this.template);
    const creator = new DOMCreator(this);
    if (this.currentVDOM) {
      const handler = new DOMHandler(creator);
      handler.handle(this.el, this.currentVDOM, newVDOM, 0);
    } else {
      const newDOM = creator.create(newVDOM);
      this.el.innerHTML = '';
      this.el.appendChild(newDOM);
    }
    this.currentVDOM = newVDOM;
  }

  createTemplate(el) {
    const creator = new TemplateCreator();
    return creator.create(el);
  }
}

class TemplateCreator {
  create(el) {
    switch (el.nodeType) {
      case Node.ELEMENT_NODE:
        const attributes = {};
        for (let i = 0; i < el.attributes.length; i++) {
          const node = el.attributes[i];
          attributes[node.name] = node.value;
        }
        const children = this.createChildren(el);
        return new Element(el.tagName, attributes, children);
      case Node.TEXT_NODE:
        return new Text(el.text);
    }
  }

  createChildren(el) {
    if (!el.children) {
      return [];
    }
    const children = Array.from(el.children).map((child) => {
      return this.create(child);
    }).filter(v => v);
    if (children.length === 0 && el.textContent) {
      children.push(new Text(el.textContent));
    }
    return children.flat();
  }
}

class VDOMCreator {
  constructor(model) {
    this.model = model;
  }

  create(el, variables = {}) {
    switch (el.constructor.name) {
      case 'Element':
        const attributes = Object.keys(el.attributes).reduce((prev, k) => {
          if (/^on/.test(k)) {
            prev[k] = this.evalEventHandler(el.attributes[k], variables);
          } else {
            prev[k] = this.evalText(el.attributes[k], variables);
          }
          return prev;
        }, {});
        if (el.tag === 'IF') {
          const c = this.evalText(`{${el.attributes.c}}`, variables);
          if (!c) {
            return null;
          }
          const children = this.createChildren(el, variables);
          return new Element('div', attributes, children)
        }
        if (el.tag === 'FOR') {
          const records = this.evalText(`${el.attributes.records}`, variables);
          const v = el.attributes.var;
          return records.map((record) => {
            variables[v] = record;
            const children = Array.from(el.children).map((child) => {
              return this.create(child, variables);
            }).filter(v => v).flat();
            variables[v] = null;
            return new Element('div', attributes, children)
          })
        }

        if (el.tag === 'INPUT' &&
          el.attributes.type === 'text' &&
          el.attributes.value &&
          this.model.isBind(el.attributes.value)
        ) {
          const value = String(el.attributes.value);
          const varName = value.substring(1, value.length-1);
          attributes.oninput = (e) => {
            this.model.set(varName, e.target.value);
          }
        }
        // TODO: impl
        const children = this.createChildren(el, variables);
        // if (/^[A-Z].*$/.test(el.tagName)) {
        //   const klass = eval(el.tagName);
        //   return (new klass(attributes, this.context.context)).renderTree();
        // }
        return new Element(el.tag, attributes, children);
      case 'Text':
        return new Text(this.evalText(el.text, variables));
    }
  }

  evalText(text, variables) {
    return this.model.evalText(text, variables);
  }

  evalEventHandler(text, variables) {
    return this.model.evalHandler(text, variables);
  }

  createChildren(el, variables) {
    if (!el.children) {
      return [];
    }
    const children = Array.from(el.children).map((child) => {
      return this.create(child, variables);
    }).filter(v => v);
    if (children.length === 0 && el.textContent) {
      children.push(new Text(this.evalText(el.textContent, variables)));
    }
    return children.flat();
  }
}

class DOMCreator {
  constructor(app) {
    this.app = app;
  }

  create(element) {
    if (element.constructor.name === 'Text') {
      return document.createTextNode(element.text);
    }
    const el = document.createElement(element.tag);
    for (let k in element.attributes) {
      const v = element.attributes[k];
      if (this.isEvent(k)) {
        const eventName = k.slice(2);
        el.addEventListener(eventName, (e) => {
          v(e);
          this.app.render(); // TODO: impl
          // this.app.scheduleRender();
        });
      } else {
        el.setAttribute(k, v);
      }
    }
    element.children.forEach((child) => {
      el.append(this.create(child));
    });
    return el;
  }

  isEvent(name) {
    return /^on/.test(name);
  }
}

class DOMHandler {
  constructor(domCreator) {
    this.domCreator = domCreator;
  }

  createElement(node) {
    return this.domCreator.create(node);
  }

  handle(el, oldNode, newNode, index) {
    if (!oldNode) {
      el.appendChild(this.createElement(newNode));
      return;
    }

    const target = el.childNodes[index];
    if (!newNode) {
      el.removeChild(target);
      return;
    }

    if (newNode.constructor.name !== oldNode.constructor.name) {
      el.replaceChild(this.createElement(newNode), target);
      return;
    }

    if (newNode.constructor.name === 'Text' && newNode.text !== oldNode.text) {
      el.replaceChild(this.createElement(newNode), target);
      return;
    }

    if (newNode.constructor.name === 'Element') {
      if (newNode.tag !== oldNode.tag) {
        el.replaceChild(this.createElement(newNode), target);
        return;
      }
      if (newNode.attributes.value !== oldNode.attributes.value) {
        target.value = newNode.attributes.value;
        return;
      }
      if (JSON.stringify(newNode.attributes) !== JSON.stringify(oldNode.attributes)) {
        for (let attr in oldNode.attributes) {
          target.removeAttribute(attr);
        }
        for (let attr in newNode.attributes) {
          target.setAttribute(attr, newNode.attributes[attr]);
        }
      }
      for (let i = 0; i < oldNode.children.length || i < newNode.children.length; i++) {
        this.handle(target, oldNode.children[i], newNode.children[i], i);
      }
    }
  }
}
