import Ember from 'ember';

export default Ember.Route.extend({
  model: function(params) {
    return this.get('store').findRecord('harvest-log', params.id);
  },
//   setupController(controller, model) {
//   this._super(controller, model);
//   this.controllerFor('details').get('id');
//
// }

});
