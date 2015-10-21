Ops = new Mongo.Collection('ops');
Docs = new Mongo.Collection('docs');

util = {
  getHashParam: function(name) {
    var hash = location.hash.slice(1);
    name = encodeURIComponent(name).replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("(^|&)" + name + "=([^&#]*)"),
        results = regex.exec(hash);
    return results === null ? "" : decodeURIComponent(results[2].replace(/\+/g, " "));
  },
  setHashParam: function(name, val) {
    name = encodeURIComponent(name);
    val = encodeURIComponent(val);
    var hash = location.hash.slice(1);
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("(^|&)(" + name + "=)([^&#]*)");
    if(!hash) {
      hash += (name + '=' + val);
    } else if(regex.exec(hash)) {
      hash = hash.replace(regex, '$1$2' + val);
    } else {
      hash += ('&' + name + '=' + val);
    }
    location.hash = hash;
    return hash;
  },
  isNumeric: function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }
};
