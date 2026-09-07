"""Log retrieval service."""
class LogService:
    @staticmethod
    def get_components():
        return [{"id":"game","name":"Game Servers"},{"id":"director","name":"Director"},
            {"id":"operator","name":"Operator"},{"id":"postgres","name":"PostgreSQL"},
            {"id":"rabbitmq","name":"RabbitMQ"},{"id":"pghero","name":"PgHero"}]
