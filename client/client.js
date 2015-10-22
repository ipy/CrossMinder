otType = OTJson0.type;
otDiff = OTJson0Diff.diff;

Meteor.startup(function() {
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_AND_OPTIONAL_EMAIL"
  });

  Tracker.autorun(function() {
    var user = Meteor.user();
    if(user) {
      var name = user.username || user.profile.name;
      var head;
      if(user.services && user.services.github) {
        head = 'https://avatars.githubusercontent.com/u/' + user.services.github.id;
      }
      if(!head) {
        var hash = CryptoJS.MD5($.trim(user.emails && user.emails[0] || user._id).toLowerCase());
        head = 'http://www.gravatar.com/avatar/' + hash + '?' + 'd=retro';
      }
      $('#user-head').attr('src', head);

      if(window.TogetherJS) {
        window.TogetherJSConfig_getUserName = function () {return name;};
        window.TogetherJSConfig_getUserAvatar = function () {return head;};
        //window.TogetherJSConfig_getUserColor = function () {return '#ff00ff';};
        window.TogetherJS.refreshUserData();
      }
    } else {
      $('#user-head').attr('src', '');
      delete window.TogetherJSConfig_getUserName;
      delete window.TogetherJSConfig_getUserAvatar;
      window.TogetherJS.refreshUserData();
    }
  });
});

Meteor.subscribe("userData");

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