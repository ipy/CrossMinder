otType = Meteor.npmRequire('ot-json0').type;

Meteor.publish("ops", function () {
  return Ops.find();
});