export const getAuthToken = () => {
  return localStorage.getItem("adminToken") || "";
};

