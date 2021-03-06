import Ember from 'ember';

export default Ember.Controller.extend({
  queryParams: [
    'links',
  ],
  page: 1,
  meta: Ember.computed('model', function() {
    let metadata = this.store.metadataFor('harvest-log');
    return Ember.get(metadata, 'pagination');
  }),
  actions: {
    nextPage() {
      let page = this.get('page');
      this.set('page', page + 1);
    },

    prevPage() {
      this.set('page', this.get('page') - 1);
    }
  }

});
