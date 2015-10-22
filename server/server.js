otType = Meteor.npmRequire('ot-json0').type;

Meteor.publish("ops", function () {
  return Ops.find();
});

Meteor.publish("docs", function () {
  return Docs.find();
});

Meteor.publish("userData", function () {
  if (this.userId) {
    return Meteor.users.find({_id: this.userId}, {fields: {'services.github.id': 1}});
  } else {
    this.ready();
  }
});

Meteor.methods({
  createDocIfNotExists: function(docId, initOp) {
    initOp = initOp || [];
    initOp = initOp.filter(function(item) { return item; });
    var doc = Docs.findOne(docId);
    if(doc) return doc;
    var snapshot = {};
    snapshot = otType.apply(snapshot, initOp);
    doc = {_id: docId, snapshot: snapshot, snapshotVersion: 0};
    Docs.insert(doc);
    Ops.insert({version: 0, docId: docId, op: initOp});
    return doc;
  },
  getOps: function(docId, fromVersion, toVersion) {
    var version = {};
    if(util.isNumeric(fromVersion)) { version.$gt = fromVersion; }
    if(util.isNumeric(toVersion)) { version.$lte = toVersion; }
    return Ops.find({docId: docId, version: version}).fetch();
  },
  submitOp: function(docId, fromVersion, op) {
    if(!op || !op.length) { return; }
    op = op.filter(function(item) { return item; });
    var doc = Docs.findOne(docId);
    if(!doc) throw new Meteor.Error('doc not exists');
    var version = doc.snapshotVersion;
    if(fromVersion > version) {
      throw new Meteor.Error('invalid op version', 'The op version should be from a previous snapshot, so it should never never exceed the current snapshot\'s version');
    }
    var appliedOps;
    if(fromVersion < version) {
      appliedOps = Meteor.call('getOps', docId, fromVersion, version);
      for(var i = 0; i < appliedOps.length; i++) {
        var appliedOp = appliedOps[i].op;
        op = otType.transform(op, appliedOp, 'left');
      }
    } else {
      appliedOps = [];
    }
    doc.snapshot = otType.apply(doc.snapshot, op);
    doc.snapshotVersion += 1;
    Ops.insert({docId: docId, version: doc.snapshotVersion, op: op});
    Docs.update(docId, {snapshot: doc.snapshot, snapshotVersion: doc.snapshotVersion});
    return {snapshot: doc.snapshot, snapshotVersion: doc.snapshotVersion, appliedOps: appliedOps};
  }
});
