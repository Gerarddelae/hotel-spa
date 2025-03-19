def remove_sensitive_fields(data, sensitive_fields=["password"]):
    """
    Elimina campos sensibles de una lista de diccionarios o de un solo diccionario.
    """
    if isinstance(data, list):
        return [{k: v for k, v in item.items() if k not in sensitive_fields} for item in data]
    elif isinstance(data, dict):
        return {k: v for k, v in data.items() if k not in sensitive_fields}
    else:
        return data