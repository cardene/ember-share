import Ember from 'ember';
import ApplicationController from './application';
import buildQueryString from '../utils/build-query-string';

export default ApplicationController.extend({
    size: 10,
    page: 0,
    query: {},
    queryDict: {},
    actions: {
        search(searchString, append) {
            this.set('page', 0);
            this.set('queryDict', {});
            let query = this.get('query');
            let queryDict = searchString && query ? {query: query, q: searchString} : (searchString ? {q: searchString} : (query ? {query: query} : {}))

            this.set('queryDict', queryDict);
            this.store.query('elastic-search-result', queryDict).then(responses => {
                this.set('searchData', responses);
            });
        },
        queryChanged(facet) {
            this.set('queryString', 'http://localhost:9200/share/_search?' + buildQueryString(facet));
            this.set('query', facet);
        },
        addFilter(filter) {

        },
        next() {
            let from_ = (this.get('page') + 1) * this.get('size');
            var currentResults = this.get('searchData');
            var queryDict = this.get('queryDict');
            queryDict.from = from_;
            this.store.query('elastic-search-result', queryDict).then(newResults => {
                newResults.map(result => currentResults.addObject(result));
                //doesnt work, figure out how to concatenate the results;
                this.set('searchData', currentResults);
            })
        }
    }
});