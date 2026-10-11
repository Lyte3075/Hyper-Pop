const siteBase = location.pathname.includes('/v5-static/')
    ? location.pathname.substring(0, location.pathname.indexOf('/v5-static/')) + '/v5-static'
    : '';
self.__uv$config = {
    prefix: siteBase + '/uv/',
    bare: 'https://v5.3kh0.net/bare/',
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: siteBase + '/ultraviolet/uv.handler.js',
    bundle: siteBase + '/ultraviolet/uv.bundle.js',
    config: siteBase + '/ultraviolet/uv.config.js',
    sw: siteBase + '/ultraviolet/uv.sw.js',
};
