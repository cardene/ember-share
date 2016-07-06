import ENV from '../config/environment';

export default function() {
    //ideally check env for this:
    this.get('/profile', () => {
        return {
            data: {
                '@id': 'aGuid',
                username: 'anEmail@net.beans',
                name: 'FirstName',
                gravatar: 'http://www.gravatar.com/avatar/911a5cc0f2182a5ab58e421211af6d03',
                token: 'sunDontShineIntheShadeBirdCantFlyInTheCage'
            }
        };
    });
    this.passthrough('http://localhost:8000/**');
    this.passthrough('http://localhost:9200/share/**');
    this.namespace = '/api';
    this.get('/changeset');
    this.get('/changeset/:id');
    this.get('/changes');
    this.get('/changes/:id');
    this.get('/venues');
    this.get('/venues/');
    this.get('/institutions');
    this.get('/institutions/:id');
    this.get('/manuscripts');
    this.get('/manuscript/:id');
    this.get('/preprints');
    this.get('/preprints/:id');
    this.get('/creative-works');
    this.get('/creative-works/:id');
    this.get('/tags');
    this.get('/tags/:id');
    this.get('/taxonomy');
    this.get('/taxonomy/:id');
    this.get('/awards');
    this.get('/awards/:id');
    this.get('/funders');
    this.get('/funders/:id');
    this.get('/raw');
    this.get('/raw/:id');
}