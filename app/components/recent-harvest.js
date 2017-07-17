import Ember from 'ember';

export default Ember.Component.extend({

  store: Ember.inject.service(),

  recentHarvests: Ember.computed('sourceConfigId', function(){
    return this.get('store').query('harvest-log', { source_config_id: this.get('sourceConfigId')} );
  }),

});
