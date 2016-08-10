import _ from 'lodash/lodash';
import moment from 'moment';
import Ember from 'ember';
import ApplicationController from './application';
import buildElasticCall from '../utils/build-elastic-call';
import ENV from '../config/environment';
import { termsFilter, dateRangeFilter, getUniqueList, getSplitParams } from '../utils/elastic-query';

let filterQueryParams = ['tags', 'sources', 'publisher', 'funder', 'institution', 'organization', 'language', 'contributors', 'type'];

export default ApplicationController.extend({

    queryParams:  Ember.computed(function() {
        let allParams = ['searchString', 'start', 'end', 'sort'];
        allParams.push(...filterQueryParams);
        return allParams;
    }),

    page: 1,
    size: 10,
    query: {},
    searchString: '',
    tags: '',
    sources: '',
    publisher: '',
    funder: '',
    institution: '',
    organization: '',
    language: '',
    contributors: '',
    start: '',
    end: '',
    type: '',
    sort: '',

    noResultsMessage: Ember.computed('numberOfResults', function() {
        return this.get('numberOfResults') > 0 ? '' : 'No results. Try removing some filters.';
    }),

    collapsedQueryBody: true,

    results: Ember.ArrayProxy.create({content: []}),
    loading: true,
    eventsLastUpdated: Date().toString(),
    numberOfResults: 0,
    took: 0,
    numberOfSources: 0,

    sortOptions: [
        {
            display: 'relevance',
            sortBy: ''
        },
        {
            display: 'date',
            sortBy: 'date_updated'
        }
    ],

    init() {
        //TODO Sort initial results on date_modified
        this._super(...arguments);
        this.set('facetFilters', Ember.Object.create());
        // TODO Load all previous pages when hitting a page with page > 1
        // if (this.get('page') != 1) {
        //   query.from = 0;
        //   query.size = this.get('page') * this.get('size');
        // }
        this.loadEventCount();
        this.loadSourcesCount();
        this.set('debouncedLoadPage', _.debounce(this.loadPage.bind(this), 250));
    },

    loadEventCount(){
        var url = ENV.apiUrl + '/api/search/abstractcreativework/_count';
        return Ember.$.ajax({
            'url': url,
            'crossDomain': true,
            'type': 'GET',
            'contentType': 'application/json',
        }).then((json) => {
            this.set('numberOfEvents', json.count);
        });
    },

    loadSourcesCount() {
        let url = url || ENV.apiUrl + '/api/providers/';
        this.set('loading', true);
        return Ember.$.ajax({
            'url': url,
            'crossDomain': true,
            'type': 'GET',
            'contentType': 'application/json',
        }).then((json) => {
            this.set('numberOfSources', json.count);
        });
    },

    searchUrl: Ember.computed(function() {
        return buildElasticCall();
    }),

    getQueryBody() {
        let facetFilters = this.get('facetFilters');
        let filters = [];
        for (let k of Object.keys(facetFilters)) {
            let filter = facetFilters[k];
            if (filter) {
                if (Ember.$.isArray(filter)) {
                    filters = filters.concat(filter);
                } else {
                    filters.push(filter);
                }
            }
        }

        let query = {
            'query_string' : {
                'query': this.get('searchString') || '*'
            }
        };
        if (filters.length) {
            query = {
                'bool': {
                    'must': query,
                    'filter': filters
                }
            };
        }

        let page = this.get('page');
        let queryBody = {
            query,
            from: (page - 1) * this.get('size')
        };
        if (this.get('sort')) {
            let sortBy = {};
            sortBy[this.get('sort')] = 'desc';
            queryBody.sort = sortBy;
        }
        if (page === 1) {
            queryBody.aggregations = this.get('elasticAggregations');
        }

        this.set('displayQueryBody', { query } );
        return this.set('queryBody', queryBody);
    },

    elasticAggregations: Ember.computed(function() {
        return {
            "sources" : {
                "terms" : {
                    "field" : "sources",
                    "size": 200
                }
            }
        };
    }),

    loadPage() {
        let queryBody = JSON.stringify(this.getQueryBody());
        this.set('loading', true);
        return Ember.$.ajax({
            'url': this.get('searchUrl'),
            'crossDomain': true,
            'type': 'POST',
            'contentType': 'application/json',
            'data': queryBody
        }).then((json) => {
            this.set('numberOfResults', json.hits.total);
            this.set('took', moment.duration(json.took).asSeconds());
            let results = json.hits.hits.map((hit) => {
                // HACK
                let source = hit._source;
                source.id = hit._id;
                source.type = 'elastic-search-result';
                source.workType = source['@type'];
                source.contributors = source.contributors.map(contributor => {
                    return {
                        familyName: contributor.family_name,
                        givenName: contributor.given_name,
                        id: contributor['@id']
                    };
                });
                return source;
            });
            Ember.run(() => {
                if (json.aggregations) {
                    this.set('aggregations', json.aggregations);
                }
                this.set('loading', false);
                this.get('results').addObjects(results);
            });
        });
    },

    search() {
        this.set('page', 1);
        this.set('loading', true);
        this.get('results').clear();
        this.get('debouncedLoadPage')();
    },

    facets: Ember.computed(function() {
        return [
            { key: 'sources', title: 'Source', type: 'source', component: 'search-facet-source', raw: false },
            { key: 'date', title: 'Date', component: 'search-facet-daterange' },
            { key: 'type', title: 'Type', component: 'search-facet-worktype' },
            { key: 'tags', title: 'Subject/Tag', component: 'search-facet-typeahead', type: 'tag', raw: true },
            { key: 'publisher', title: 'Publisher', component: 'search-facet-association' },
            { key: 'funder', title: 'Funder', component: 'search-facet-association' },
            { key: 'institution', title: 'Institution', component: 'search-facet-association' },
            { key: 'organization', title: 'Organization', component: 'search-facet-association' },
            { key: 'language', title: 'Language', component: 'search-facet-language' },
            { key: 'contributors', title: 'People', type: 'person', useId: true, component: 'search-facet-person' },
        ];
    }),

    facetStates: Ember.computed(...filterQueryParams, 'end', 'start', function() {
        let facetStates = {};
        for (let param of filterQueryParams) {
            facetStates[param] = getSplitParams(this.get(param));
        }
        facetStates['date'] = {start: this.get('start'), end: this.get('end')};
        return facetStates;
    }),

    atomFeedUrl: Ember.computed('queryBody', function() {
        let query = this.get('queryBody.query');
        let encodedQuery = encodeURIComponent(JSON.stringify(query));
        return `${ENV.apiUrl}/api/atom/?elasticQuery=${encodedQuery}`;
    }),

    actions: {

        addFilter(type, filterValue) {
            let currentValue = getSplitParams(this.get(type)) || [];
            let newValue = getUniqueList([filterValue].concat(currentValue));
            this.set(type, newValue);
        },

        removeFilter(type, filterValue) {
            let currentValue = getSplitParams(this.get(type)) || [];
            let index = currentValue.indexOf(filterValue);
            if (index > -1) {
                currentValue.splice(index, 1);
            }
            this.set(type, currentValue);
        },

        toggleCollapsedQueryBody() {
            this.toggleProperty('collapsedQueryBody');
        },

        typing(val, event) {
            // Ignore all keycodes that do not result in the value changing
            // 8 == Backspace, 32 == Space
            if (event.keyCode < 49 && !(event.keyCode === 8 || event.keyCode === 32)) {
                return;
            }
            this.search();
        },

        search() {
            this.search();
        },

        updateParams(key, value) {
            if (key === 'date') {
                this.set('start', value.start);
                this.set('end', value.end);
            } else {
                value = value ? value : '';
                this.set(key, value);
            }
        },

        filtersChanged() {
            this.search();
        },

        next() {
            // If we don't have full pages then we've hit the end of our search
            if (this.get('results.length') % this.get('size') !== 0) {
                return;
            }
            this.incrementProperty('page', 1);
            this.loadPage();
        },

        prev() {
            // No negative pages
            if (this.get('page') < 1) {
                return;
            }
            this.decrementProperty('page', 1);
            this.loadPage();
        },

        selectSortOption(option) {
            this.set('sort', option);
            this.search();
        },

        setTermFilter(field, term) {
            let filter = null;
            // HACK This logic could be more generic.
            if (field === 'sources') {
                filter = termsFilter(field, [term], false);
            } else if (field === 'types') {
                filter = termsFilter('@type', [term]);
            }
            if (filter) {
                let facetFilters = this.get('facetFilters');
                facetFilters.set(field, filter);
                this.search();
            }
        },

        setDateFilter(start, end) {
            let key = 'date';
            let filter = dateRangeFilter(key, start, end);
            let facetFilters = this.get('facetFilters');
            facetFilters.set(key, filter);
            this.search();
        },

        clearFilters() {
            this.set('facetFilters', Ember.Object.create());
            for (var param in filterQueryParams) {
                let key = filterQueryParams[param];
                if (filterQueryParams.indexOf(key) > -1) {
                    this.set(key, '');
                }
            }
            this.set('start', '');
            this.set('end', '');
            this.set('sort', '');
            this.search();
        }
    }
});
