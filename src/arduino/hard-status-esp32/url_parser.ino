/**
 * Based on https://github.com/jaysonsantos/url-parser-c
 */
#include "common.h"

void free_parsed_url(struct url_parser_url_t *url_parsed) {
  if (url_parsed->protocol)
    free(url_parsed->protocol);
  if (url_parsed->host)
    free(url_parsed->host);
  if (url_parsed->path)
    free(url_parsed->path);
  if (url_parsed->query_string)
    free(url_parsed->query_string);
}

void parse_url(const char *url, struct url_parser_url_t *parsed_url) {
  char *local_url = (char *) malloc(sizeof(char) * (strlen(url) + 1));
  char *token;
  char *token_host;
  char *host_port;

  char *token_ptr;
  char *host_token_ptr;

  char *path = NULL;

  // Copy our string
  strcpy(local_url, url);

  token = strtok_r(local_url, ":", &token_ptr);
  parsed_url->protocol = (char *) malloc(sizeof(char) * strlen(token) + 1);
  strcpy(parsed_url->protocol, token);

  // Host:Port
  token = strtok_r(NULL, "/", &token_ptr);
  if (token) {
    host_port = (char *) malloc(sizeof(char) * (strlen(token) + 1));
    strcpy(host_port, token);
  } else {
    host_port = (char *) malloc(sizeof(char) * 1);
    strcpy(host_port, "");
  }

  token_host = strtok_r(host_port, ":", &host_token_ptr);
  if (token_host) {
    parsed_url->host = (char *) malloc(sizeof(char) * strlen(token_host) + 1);
    strcpy(parsed_url->host, token_host);
  } else {
    parsed_url->host = NULL;
  }

  // Port
  token_host = strtok_r(NULL, ":", &host_token_ptr);
  if (token_host)
    parsed_url->port = atoi(token_host);
  else
    parsed_url->port = 0;

  token_host = strtok_r(NULL, ":", &host_token_ptr);
  assert(token_host == NULL);

  token = strtok_r(NULL, "?", &token_ptr);
  parsed_url->path = NULL;
  if (token) {
    path = (char *) realloc(path, sizeof(char) * (strlen(token) + 2));
    strcpy(path, "/");
    strcat(path, token);

    parsed_url->path = (char *) malloc(sizeof(char) * strlen(path) + 1);
    strncpy(parsed_url->path, path, strlen(path));
    parsed_url->path[strlen(path)] = 0;

    free(path);
  } else {
    parsed_url->path = (char *) malloc(sizeof(char) * 2);
    strcpy(parsed_url->path, "/");
  }

  token = strtok_r(NULL, "?", &token_ptr);
  if (token) {
    parsed_url->query_string = (char *) malloc(sizeof(char) * (strlen(token) + 1));
    strncpy(parsed_url->query_string, token, strlen(token));
  } else {
    parsed_url->query_string = NULL;
  }

  token = strtok_r(NULL, "?", &token_ptr);
  assert(token == NULL);

  free(local_url);
  free(host_port);
}

int url_convert(struct url_parser_url_t* from, struct wifi_client_url_t* to) {
  if (from->protocol == NULL) return -1;
  
  if (strcmp(from->protocol, "https") == 0) {
    if (from->port == 0) to->port = 443;
    else to->port = from->port;
    to->https = true;
  } else if (strcmp(from->protocol, "http") == 0) {
    if (from->port == 0) to->port = 80;
    else to->port = from->port;
    to->https = false;
  } else {
    return -2;
  }
  if (to->port < 0 || to->port > 65535) return -3;
  
  if (from->host == NULL) return -4;
  to->host = from->host;

  to->path = from->path;
  to->query_string = from->query_string;

  return 0;
}

bool url_verify(const char* url) {
  DEBUGf("url_verify(%s)\n", url);
  struct url_parser_url_t parsed;
  struct wifi_client_url_t converted;
  DEBUG("url_verify() parsing");
  parse_url(url, &parsed);
  DEBUG("url_verify() converting");
  const bool result = url_convert(&parsed, &converted) == 0;
  DEBUG("url_verify() freeing");
  free_parsed_url(&parsed);
  return result;
}

