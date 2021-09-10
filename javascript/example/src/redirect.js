// redirect from example to example/bundle for demo
// link backward compatibility
const url = new URL(location.href);
const tokens = url.pathname.split(/[\\/]/g);
const filename = tokens.pop();
const parentDirectory = tokens[ tokens.length - 1 ];
if (parentDirectory !== 'bundle') {
    url.pathname = tokens.join('/') + '/';
    window.location.replace(new URL('bundle/' + filename, url.toString()));
}
