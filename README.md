# My Vue like Application

```html
<html>
<head></head>
<body>
<div id="app">
    <ul>
        <li>Hello</li>
        <li>{hoge}</li>
        <li>{foo}</li>
        <li>{bar}</li>
    </ul>
    <ul>
        <for records="{list}" var="item" >
            <li>{item}</li>
        </for>
    </ul>
    <input type="text" value="{hoge}" />
    <input type="text" value="{foo}" />
    <input type="text" value="{bar}" />
    <input type="button" value="Add" onclick="{onclick}" />
</div>
<script src="./lib.js"></script>
<script src="./main.js"></script>
</body>
</html>
```

```js
new MyVue({
  model: {
    hoge: 123,
    foo: 'yeee',
    bar: 'hello',
    list: [
      'aaa',
      'bbb',
    ],
    onclick: function() {
      this.list.push(this.hoge);
    }
  },
  selector: '#app',
});
```