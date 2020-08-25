function hash(salt, message) {
    var hash = forge.md.sha256.create();
    hash.update(salt + message);
    return hash.digest().toHex();
};

$( document ).ready(function() {
    $('#login-form').submit(function() {
        $('#login-form').hide();
        var pass = $('#password').val();
        var salt = $('#salt').val();
        $('#password').val(hash(salt, pass));
        return true;
    });
});
