FROM python:3.10@sha256:546aebf016bc6fcdfc8a2bcc052bd8dc6e34703e5c3edc811ce6fb3961a88c22

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
