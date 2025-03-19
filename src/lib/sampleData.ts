export function generateSampleData() {
  // Define the nodes based on the screenshot
  const nodes = [
    {
      id: "content_guidelines",
      label: "Content Guidelines",
      type: "Standard",
      color: "#3498db",
      description: "Guidelines for content broadcasting",
      synonyms: ["Content Guidelines"],
      properties: {
        area: "Compliance Area"
      }
    },
    {
      id: "usc_1464",
      label: "18 U.S.C. § 1464",
      type: "Regulation",
      color: "#2980b9",
      description: "Federal regulation on broadcasting standards",
      synonyms: ["18 U.S.C. § 1464"],
      properties: {
        citation: "18 U.S.C. § 1464"
      }
    },
    {
      id: "fcc_regulations",
      label: "FCC regulations (47 CFR)",
      type: "Regulation",
      color: "#2980b9",
      synonyms: ["FCC regulations (47 CFR)"],
      properties: {
        citation: "47 CFR"
      }
    },
    {
      id: "ip",
      label: "Intellectual Property",
      type: "Concept",
      color: "#3498db",
      synonyms: ["Intellectual Property"],
      properties: {
        description: "Compliance related to intellectual property"
      }
    },
    {
      id: "media",
      label: "Media",
      type: "Entity",
      color: "#3498db"
    },
    {
      id: "labeling",
      label: "Labeling",
      type: "Standard",
      color: "#3498db",
      synonyms: ["Labeling"],
      properties: {
        description: "Labeling standards for media"
      }
    },
    {
      id: "mpa",
      label: "Motion Picture Association (MPA)",
      type: "Organization",
      color: "#e67e22",
      description: "Film rating system"
    },
    {
      id: "network_standards",
      label: "Network Standards & Practices",
      type: "Standard",
      color: "#3498db"
    },
    {
      id: "parental_guidelines",
      label: "TV Parental Guidelines",
      type: "Standard",
      color: "#3498db"
    },
    {
      id: "trade_compliance",
      label: "Trade Compliance",
      type: "Compliance",
      color: "#16a085"
    },
    {
      id: "miller_v_california",
      label: "Miller v. California",
      type: "Legal Case",
      color: "#8e44ad",
      description: "413 U.S. 15 (1973)"
    },
    {
      id: "telecom_act_1996",
      label: "Telecommunications Act of 1996",
      type: "Legislation",
      color: "#c0392b"
    },
    {
      id: "riaa",
      label: "Recording Industry Parental Advisory Label",
      type: "Standard",
      color: "#3498db"
    }
  ];

  // Define the links between nodes
  const links = [
    { source: "content_guidelines", target: "usc_1464", label: "HAS_REGULATION" },
    { source: "content_guidelines", target: "fcc_regulations", label: "HAS_REGULATION" },
    { source: "content_guidelines", target: "ip", label: "RELATED_TO" },
    { source: "content_guidelines", target: "labeling", label: "RELATED_TO" },
    { source: "content_guidelines", target: "network_standards", label: "HAS_STANDARD" },
    { source: "content_guidelines", target: "parental_guidelines", label: "HAS_STANDARD" },
    { source: "media", target: "content_guidelines", label: "HAS_COMPLIANCE" },
    { source: "mpa", target: "content_guidelines", label: "HAS_STANDARD" },
    { source: "content_guidelines", target: "trade_compliance", label: "IMPACTS" },
    { source: "miller_v_california", target: "content_guidelines", label: "HAS_REGULATION" },
    { source: "telecom_act_1996", target: "content_guidelines", label: "HAS_REGULATION" },
    { source: "riaa", target: "content_guidelines", label: "RELATED_TO" }
  ];

  return { nodes, links };
}
