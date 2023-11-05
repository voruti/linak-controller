FROM python:3.10

WORKDIR /app
# allows Python's output to be seen in the log:
ENV PYTHONUNBUFFERED=1

# install required packages:
RUN apt-get update && \
    apt-get install -y \
        bluez bluetooth \
        # for healthcheck:
        jq && \
    pip install poetry

# linak-controller dependencies:
COPY poetry.lock pyproject.toml ./
RUN poetry install

COPY ./ ./

# healthcheck:
RUN chmod +x recipes/docker/healthcheck.sh
HEALTHCHECK --interval=120s --retries=2 --start-period=60s CMD /app/recipes/docker/healthcheck.sh

ENTRYPOINT ["sh", "recipes/docker/docker_entrypoint.sh"]
