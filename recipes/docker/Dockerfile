FROM python:3.13@sha256:8c55c44b9e81d537f8404d0000b7331863d134db87c1385dd0ec7fefff656495

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
