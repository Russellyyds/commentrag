// Category color mapping
export const getCategoryColor = (category) => {
    const colorMap = {
      "OK": "success",
      "Needs Review": "warning",
      "Appearance": "info",
      "Complaint": "error",
      "Cultural": "secondary",
      "Language": "primary",
      "Mental Health": "secondary",
      "Sexism": "error",
      "Wrong Staff": "warning"
    };
    
    return colorMap[category] || "default";
  };
  
  // Mock data for development
  export const mockComments = [
    { id: 1001, comment: "The service was excellent, very pleased with my experience.", category: "OK", confidence: 98, date: "2025-03-01" },
    { id: 1002, comment: "The agent was rude and didn't listen to my concerns.", category: "Complaint", confidence: 87, date: "2025-03-02" },
    { id: 1003, comment: "Interface is confusing, couldn't find what I needed.", category: "Appearance", confidence: 76, date: "2025-03-03" },
    { id: 1004, comment: "Your system doesn't respect my cultural background.", category: "Cultural", confidence: 45, date: "2025-03-04" },
    { id: 1005, comment: "The language options are very limited.", category: "Language", confidence: 92, date: "2025-03-05" },
    { id: 1006, comment: "Feeling anxious using your product, it's stressful.", category: "Mental Health", confidence: 65, date: "2025-03-06" },
    { id: 1007, comment: "Why do you assume all users are men?", category: "Sexism", confidence: 82, date: "2025-03-07" },
    { id: 1008, comment: "I was transferred to the wrong department three times.", category: "Wrong Staff", confidence: 91, date: "2025-03-08" },
    { id: 1009, comment: "This comment is ambiguous and hard to classify.", category: "OK", confidence: 30, date: "2025-03-09" },
  ];
  
  export const categories = [
    "All Tags",
    "OK", 
    "Needs Review", 
    "Appearance", 
    "Complaint", 
    "Cultural", 
    "Language", 
    "Mental Health", 
    "Sexism", 
    "Wrong Staff",
    "Needs Review"
  ];