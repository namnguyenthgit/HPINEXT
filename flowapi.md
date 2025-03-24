# API Flow Documentation

## Overview
This document is designed to create flow API HPI management system by ITHPI-Team

## 1. Payment Portal Flow
This is description how to process POS transaction withpayment portal multiples real life paymentportal:
-  **Zalopay**
-  **Galaxypay**
-  **OCBpay**
-  **Vnpay**
## Flow Diagram:
```mermaid
flowchart Payment Portal
    StaticWeb["Request"] --> Middleware["Read/Create/Update/Delete Transactions"]
    B --> C{"Registration\nSuccessful?"}
    C -->|Yes| D["Send Verification\nEmail"]
    C -->|No| E["Show Error"]
    D --> F["User Submits\nVerification Code"]
    F --> G{"Code Valid?"}
    G -->|Yes| H["Account Activated"]
    G -->|No| I["Show Error"]
    H --> END["End"]
    E --> END
    I --> END
```

### Basic Information
- **Endpoint**: `/api/v1/[resource]`
- **Method**: `GET/POST/PUT/DELETE`
- **Description**: Brief description of what this API does

### Request Format
```json
{
    "field1": "string",
    "field2": "number",
    "field3": {
        "nested1": "string",
        "nested2": "boolean"
    }
}
```

### Response Format
```json
{
    "status": "success",
    "data": {
        "id": "string",
        "result": "object"
    },
    "message": "string"
}
```