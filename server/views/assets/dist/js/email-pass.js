function hash(salt, message) {
  let hash = forge.md.sha256.create();
  hash.update(salt + message);
  return hash.digest().toHex();
};

$( document ).ready(function() {
  $('#login-form').submit(function() {
      $('#login-form').hide();
      $('#logo').hide();
      $('#loading_spinner').show();
      let pass = $('#password').val();
      let salt = $('#salt').val();
      $('#password').val(hash(salt, pass));
      return true;
  });
});