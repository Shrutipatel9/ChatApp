const generateMessage = (
  username,
  text,
  color,
  userId,
  includeUsername = true
) => {
  return {
    text,
    color,
    userId,
    createdAt: new Date().getTime(),
    username,
  };
};

module.exports = {
  generateMessage,
};
