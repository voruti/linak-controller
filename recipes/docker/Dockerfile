FROM python:3.10@sha256:d188cfc2b726fa69a76d1eaebb50a80bc61fa312a4aad6bbda145b0ec77dcf75

WORKDIR /app
# allows Python's output to be seen in the log:
ENV PYTHONUNBUFFERED=1

# install required packages:
RUN apt-get update && \
    apt-get install -y bluez bluetooth
RUN pip install poetry

# linak-controller dependencies:
COPY poetry.lock pyproject.toml ./
RUN poetry install

COPY ./ ./

ENTRYPOINT ["sh", "recipes/docker/docker_entrypoint.sh"]
