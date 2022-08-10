//------ Previously hosted from https://www.larshartmann.dk/repository/ThreeJS/WebGL.js ------

/**
 * @author alteredq / http://alteredqualia.com/
 * @author mr.doob / http://mrdoob.com/
 */

var WEBGL = {

    isWebGLAvailable: function () {

        try {

            var canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));

        } catch (e) {

            return false;

        }

    },

    isWebGL2Available: function () {

        try {

            var canvas = document.createElement('canvas');
            return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));

        } catch (e) {

            return false;

        }

    },

    getWebGLErrorMessage: function () {

        return this.getErrorMessage(1);

    },

    getWebGL2ErrorMessage: function () {

        return this.getErrorMessage(2);

    },

    getErrorMessage: function (version) {

        var names = {
            1: 'WebGL',
            2: 'WebGL 2'
        };

        var contexts = {
            1: window.WebGLRenderingContext,
            2: window.WebGL2RenderingContext
        };

        var message = 'Your $0 does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">$1</a>';

        var element = document.createElement('div');
        element.id = 'webglmessage';
        element.style.fontFamily = 'monospace';
        element.style.fontSize = '13px';
        element.style.fontWeight = 'normal';
        element.style.textAlign = 'center';
        element.style.background = '#fff';
        element.style.color = '#000';
        element.style.padding = '1.5em';
        element.style.width = '400px';
        element.style.margin = '5em auto 0';

        if (contexts[version]) {

            message = message.replace('$0', 'graphics card');

        } else {

            message = message.replace('$0', 'browser');

        }

        message = message.replace('$1', names[version]);

        element.innerHTML = message;

        return element;

    }

};

//------ Previously hosted from https://www.larshartmann.dk/repository/ThreeJS/stats.min.js ------
// stats.js - http://github.com/mrdoob/stats.js

var Stats = function () {
    function h(a) {
        c.appendChild(a.dom);
        return a
    }

    function k(a) {
        for (var d = 0; d < c.children.length; d++) c.children[d].style.display = d === a ? "block" : "none";
        l = a
    }
    var l = 0,
        c = document.createElement("div");
    c.style.cssText = "position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000";
    c.addEventListener("click", function (a) {
        a.preventDefault();
        k(++l % c.children.length)
    }, !1);
    var g = (performance || Date).now(),
        e = g,
        a = 0,
        r = h(new Stats.Panel("FPS", "#0ff", "#002")),
        f = h(new Stats.Panel("MS", "#0f0", "#020"));
    if (self.performance && self.performance.memory) var t = h(new Stats.Panel("MB", "#f08", "#201"));
    k(0);
    return {
        REVISION: 16,
        dom: c,
        addPanel: h,
        showPanel: k,
        begin: function () {
            g = (performance || Date).now()
        },
        end: function () {
            a++;
            var c = (performance || Date).now();
            f.update(c - g, 200);
            if (c > e + 1E3 && (r.update(1E3 * a / (c - e), 100), e = c, a = 0, t)) {
                var d = performance.memory;
                t.update(d.usedJSHeapSize / 1048576, d.jsHeapSizeLimit / 1048576)
            }
            return c
        },
        update: function () {
            g = this.end()
        },
        domElement: c,
        setMode: k
    }
};
Stats.Panel = function (h, k, l) {
    var c = Infinity,
        g = 0,
        e = Math.round,
        a = e(window.devicePixelRatio || 1),
        r = 80 * a,
        f = 48 * a,
        t = 3 * a,
        u = 2 * a,
        d = 3 * a,
        m = 15 * a,
        n = 74 * a,
        p = 30 * a,
        q = document.createElement("canvas");
    q.width = r;
    q.height = f;
    q.style.cssText = "width:80px;height:48px";
    var b = q.getContext("2d");
    b.font = "bold " + 9 * a + "px Helvetica,Arial,sans-serif";
    b.textBaseline = "top";
    b.fillStyle = l;
    b.fillRect(0, 0, r, f);
    b.fillStyle = k;
    b.fillText(h, t, u);
    b.fillRect(d, m, n, p);
    b.fillStyle = l;
    b.globalAlpha = .9;
    b.fillRect(d, m, n, p);
    return {
        dom: q,
        update: function (f,
            v) {
            c = Math.min(c, f);
            g = Math.max(g, f);
            b.fillStyle = l;
            b.globalAlpha = 1;
            b.fillRect(0, 0, r, m);
            b.fillStyle = k;
            b.fillText(e(f) + " " + h + " (" + e(c) + "-" + e(g) + ")", t, u);
            b.drawImage(q, d + a, m, n - a, p, d, m, n - a, p);
            b.fillRect(d + n - a, m, a, p);
            b.fillStyle = l;
            b.globalAlpha = .9;
            b.fillRect(d + n - a, m, a, e((1 - f / v) * p))
        }
    }
};
"object" === typeof module && (module.exports = Stats);
