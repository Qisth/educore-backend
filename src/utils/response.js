function success(res, code, message, data = null) {
  return res.status(code).json({
    status: "success",
    code,
    message,
    data,
  });
}

function error(res, code, message) {
  return res.status(code).json({
    status: "error",
    code,
    message,
  });
}

module.exports = { success, error };
