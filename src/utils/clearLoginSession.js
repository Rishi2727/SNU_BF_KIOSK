export const clearLoginSession = () => {
    const keys = ["userId", "userName", "token", "isLoggedIn", "isAuthenticated"];
    keys.forEach((key) => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    });
  };
  