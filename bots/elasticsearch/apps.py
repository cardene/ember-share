from share.bot import BotAppConfig


class AppConfig(BotAppConfig):
    name = 'bots.elasticsearch'
    version = '0.0.1'

    def get_bot(self):
        from bots.elasticsearch.bot import ElasticSearchBot
        return ElasticSearchBot(self)
