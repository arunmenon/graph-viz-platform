export function generateSampleData() {
  // Define the nodes for database tables and columns with enhanced colors
  const nodes = [
    {
      id: "customers_table",
      label: "Customers Table",
      type: "Table",
      color: "#1565C0", // Strong blue for tables
      description: "Contains customer information",
      synonyms: ["Customer Table", "Customers"],
      properties: {
        schema: "public"
      }
    },
    {
      id: "customer_id",
      label: "customer_id",
      type: "Column",
      color: "#6A1B9A", // Rich purple for columns
      description: "Primary key for customers table",
      properties: {
        dataType: "UUID",
        isPrimaryKey: true
      }
    },
    {
      id: "customer_name",
      label: "customer_name",
      type: "Column",
      color: "#6A1B9A", // Rich purple for columns
      properties: {
        dataType: "VARCHAR"
      }
    },
    {
      id: "customer_email",
      label: "customer_email",
      type: "Column",
      color: "#6A1B9A", // Rich purple for columns
      properties: {
        dataType: "VARCHAR"
      }
    },
    {
      id: "orders_table",
      label: "Orders Table",
      type: "Table",
      color: "#1565C0", // Strong blue for tables
      description: "Contains order information",
      synonyms: ["Order Table", "Orders"],
      properties: {
        schema: "public"
      }
    },
    {
      id: "order_id",
      label: "order_id",
      type: "Column",
      color: "#6A1B9A", // Rich purple for columns
      properties: {
        dataType: "UUID",
        isPrimaryKey: true
      }
    },
    {
      id: "order_customer_id",
      label: "customer_id",
      type: "Column",
      color: "#9C27B0", // Lighter purple for foreign key columns
      properties: {
        dataType: "UUID",
        foreignKey: "customers.customer_id"
      }
    },
    {
      id: "products_table",
      label: "Products Table",
      type: "Table",
      color: "#1565C0", // Strong blue for tables
      description: "Contains product information",
      synonyms: ["Product Table", "Products"],
      properties: {
        schema: "public"
      }
    },
    {
      id: "product_id",
      label: "product_id",
      type: "Column",
      color: "#6A1B9A", // Rich purple for columns
      properties: {
        dataType: "UUID",
        isPrimaryKey: true
      }
    },
    {
      id: "person_concept",
      label: "Person",
      type: "Concept",
      color: "#FF6F00", // Deep orange for concepts
      description: "Semantic concept of a person"
    },
    {
      id: "transaction_concept",
      label: "Transaction",
      type: "Concept",
      color: "#FF6F00", // Deep orange for concepts
      description: "Semantic concept of a business transaction"
    },
    {
      id: "product_concept",
      label: "Product",
      type: "Concept",
      color: "#FF6F00", // Deep orange for concepts
      description: "Semantic concept of a product or item"
    },
    {
      id: "identity_concept",
      label: "Identity",
      type: "Concept",
      color: "#FF6F00", // Deep orange for concepts
      description: "Semantic concept of identity"
    }
  ];

  // Define the links between nodes
  const links = [
    { source: "customers_table", target: "customer_id", label: "HAS_COLUMN" },
    { source: "customers_table", target: "customer_name", label: "HAS_COLUMN" },
    { source: "customers_table", target: "customer_email", label: "HAS_COLUMN" },
    { source: "orders_table", target: "order_id", label: "HAS_COLUMN" },
    { source: "orders_table", target: "order_customer_id", label: "HAS_COLUMN" },
    { source: "products_table", target: "product_id", label: "HAS_COLUMN" },
    { source: "orders_table", target: "customers_table", label: "REFERENCES" },
    { source: "customer_id", target: "identity_concept", label: "MAPS_TO" },
    { source: "customer_name", target: "person_concept", label: "MAPS_TO" },
    { source: "orders_table", target: "transaction_concept", label: "MAPS_TO" },
    { source: "products_table", target: "product_concept", label: "MAPS_TO" },
    { source: "order_customer_id", target: "identity_concept", label: "MAPS_TO" }
  ];

  return { nodes, links };
}
