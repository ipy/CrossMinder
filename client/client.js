otType = OTJson0.type;
otDiff = OTJson0Diff.diff;

Meteor.startup(function() {
  bootCrossMinder = function(minder, editor, jsonDiff) {
    var json, initOp, isSubmitting, isPatching;

    doc = null;
    docId = util.getHashParam('docId');
    json = minder.exportJson();
    if(!docId) {
      docId = json.root.data.id;
      util.setHashParam('docId', docId);
    }

    Meteor.call('createDocIfNotExists', docId, [{p: [], oi: json}], function(error, result) {
      if(error) {
        alert('Create document failed');
        throw error
      };

      doc = result;
      if(docId !== json.root.data.id) {
        json = doc.snapshot;
        minder.importJson(json);
      }

      minder.on("contentchange", changed);
      Meteor.subscribe('ops', function() {
        Tracker.autorun(autorun);
      });
    });

    submitOp = function(op) {
      isSubmitting = true;
      Meteor.call('submitOp', docId, doc.snapshotVersion, op, function(error, result){
        isSubmitting = false;
      });
    };

    autorun = function() {
      console.log('start autorun')
      isPatching = true;
      var ops = Ops
        .find({docId: docId, version: {$gt: doc.snapshotVersion}})
        .fetch()
        .map(function(op) {
          return op.op;
        });
      if(!ops.length) {
        isPatching = false;
        return;
      }
      doc.snapshotVersion += ops.length;
      var op = ops.reduce(function(op1, op2) {
        return otType.compose(op1, op2);
      }, []);
      doc.snapshot = otType.apply(doc.snapshot, op);

      var json = minder.exportJson();
      var diff = jsonDiff(json, doc.snapshot);
      minder.applyPatches(diff);
      setTimeout(function() { isPatching = false; }, 0);
    };

    changed = function() {
      console.log('changed')
      if(isPatching || isSubmitting) return;
      var json = minder.exportJson();
      var op = otDiff(doc.snapshot, json);
      submitOp(op);
    }
  };
});
