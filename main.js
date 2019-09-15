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