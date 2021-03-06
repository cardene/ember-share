import Ember from 'ember';
import config from './config/environment';

const Router = Ember.Router.extend({
    location: config.locationType,
    metrics: Ember.inject.service(),

    didTransition() {
        this._super(...arguments);
        this._trackPage();
    },

    _trackPage() {
        Ember.run.scheduleOnce('afterRender', this, () => {
            const page = document.location.pathname;
            const title = this.getWithDefault('currentRouteName', 'unknown');

            this.get('metrics').trackPage({ page, title });
        });
    }
});

Router.map(function() {
  this.route('changes');
  this.route('discover');
  this.route('profile');
  this.route('settings');
  this.route('sources');
  this.route('registration', function() {
      this.route('form', { path: '/' });
      this.route('confirmation', { path: '/confirmation/' });
  });

  this.route('detail', { path: '/:type/:id' });
  this.route('curate', { path: '/curate/:type/:id' });

  this.route('elastic-down');
  this.route('notfound', { path: '/*path' });
  this.route('notfound');
  this.route('status-board');
  this.route('harvestloglist', { path: '/harvestloglist/:label/:id' });
  this.route('details', { path: 'details/:id'});
  this.route('source');
  this.route('source-config');
});


export default Router;
