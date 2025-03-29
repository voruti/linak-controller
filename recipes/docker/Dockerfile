FROM python:3.10@sha256:8ad0e578e1b733f2a496b41f179175679374191a9c7ab8c63156446094a9cda8

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
