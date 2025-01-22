The backend_kwargs value is the JSON representation of the backend_kwargs object with the following fields:

connections_prefix: prefix of the secret name to read in order to get Connections. The default is airflow-connections.
variables_prefix: prefix of the secret name to read in order to get Variables. The default is: airflow-variables.
gcp_key_path: path to the Google Cloud Credential JSON file (if not provided, the default service account is used).
gcp_keyfile_dict: Google Cloud Credential JSON dictionary. Mutually exclusive with gcp_key_path.
sep: separator used to concatenate connections_prefix and conn_id. The default is -.
project_id: Google Cloud Project Id where secrets are stored.
