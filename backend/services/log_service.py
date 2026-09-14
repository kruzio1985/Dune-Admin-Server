# Copyright (c) 2026 Kruzio
# Licensed under the PolyForm Noncommercial License 1.0.0.
# Non-commercial use only. Commercial use and selling of this code are prohibited.
# Derivative works must retain this license and link to: https://github.com/kruzio1985/Dune-Admin-Server
# https://polyformproject.org/licenses/noncommercial/1.0.0/

"""Log retrieval service."""
class LogService:
    @staticmethod
    def get_components():
        return [{"id":"game","name":"Game Servers"},{"id":"director","name":"Director"},
            {"id":"operator","name":"Operator"},{"id":"postgres","name":"PostgreSQL"},
            {"id":"rabbitmq","name":"RabbitMQ"},{"id":"pghero","name":"PgHero"}]
