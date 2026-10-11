self.__uv$config = {
    prefix: '/uv/',
    bare:'https://v5.3kh0.net/bare/',
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: '/ultraviolet/uv.handler.js',
    bundle: '/ultraviolet/uv.bundle.js',
    config: '/ultraviolet/uv.config.js',
    sw: '/ultraviolet/uv.sw.js',
};
