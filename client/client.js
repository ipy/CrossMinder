otType = OTJson0.type;
otDiff = OTJson0Diff.diff;

Meteor.subscribe('ops');
Meteor.subscribe('docs');

Meteor.startup(function() {
  bootCrossMinder = function(minder, editor, jsonDiff) {
    var json, initOp, isPatching;

    doc = null;
    docId = location.hash.slice(1);
    if(docId) doc = Docs.findOne(docId);
    if(!doc) {
      json = minder.exportJson();
      location.hash = docId = json.root.data.id;
      initOp = [{p: [], oi: json}];
    } else {
      json = doc.snapshot;
      minder.importJson(json);
    }

    submitOp = function(op) {
      Meteor.call('submitOp', docId, doc.snapshotVersion, op);
    };

    Meteor.call('createDoc', docId, initOp, function(error, result){
      if(error) throw error;
      doc = result;

      console.log(doc.snapshotVersion, doc.snapshot);

      run = function() {
        var ops = Ops.find({docId: docId, version: {$gt: doc.snapshotVersion}})
                     .fetch()
                     .filter(function(op){ return op; });
        if(!ops.length) return;
        doc.snapshotVersion += ops.length;
        var op = ops.map(function(op) {
          return op.op;
        }).reduce(function(op1, op2) {
          return otType.compose(op1, op2);
        }, []);
        doc.snapshot = otType.apply(doc.snapshot, op);

        var json = minder.exportJson();
        var diff = jsonDiff(json, doc.snapshot);
        isPatching = true;
        minder.applyPatches(diff);
        setTimeout(function() { isPatching = false; }, 0);
      };
      Tracker.autorun(run);

      changed = function() {
        if(isPatching) return;
        var json = minder.exportJson();
        var op = otDiff(doc.snapshot, json);
        submitOp(op);
      }
      minder.on("contentchange", changed);
    });
  };
});
