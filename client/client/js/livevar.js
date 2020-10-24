module.exports = class{
  constructor(val){
    var innerValue = undefined || val;
    this.initVal = val;
    this.listeners = {
      update: [],
      change: []
    };
    Object.defineProperty(this, "value", {
      get: function () { 
        return innerValue; 
      },
      set: function (v) {
        var ov = innerValue;
        innerValue = v;
        this.listeners.update.forEach((l)=>{
          l(v, ov);
        });
        if (ov !== v){
          this.listeners.change.forEach((l)=>{
            l(v, ov);
          });
        }
      }
    });
  };

  onUpdate(f){
    this.listeners.update.push(f);
  }

  onChange(f){
    this.listeners.change.push(f);
  }

  reset(){
    this.value = this.initVal;
  }

  syncDOM(el, prop="innerText"){
    this.listeners.push((v)=>{
      el[prop] = v;
    })
  }
}