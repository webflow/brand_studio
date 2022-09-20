$(function () {
    var totalDots,
        colors = ["#DCDCDC", "#898989", "#FFD2A1", "#FFB800", "#FF6D00", "#FF0000", "#B22000", "#934343", "#EAFF68", "#FEFF01", "#AA9B00", "#BBF471", "#7FAC00", "#028D00", "#374000", "#BDE5D7", "#38D996", "#726649", "#5B717F", "#008181", "#0E3E1B", "#0089B5", "#8F85DA", "#8BC7FF", "#7056F5", "#A30091", "#6A1891", "#FFE7E5", "#FFB6F3", "#FFAB9D", "#FF9BBD", "#F460FF"
    ];

    function freshDot() {
        // Append dots to any element with data-dots attribute
        $("[data-dots]").each(function () {
            if ($(this).attr("data-dots")) {
                //get number of dots from attribute
                totalDots = $(this).attr("data-dots");
                //creat the dots
                for (var i = 0; i < totalDots; i++) {
                    $(this).append('<div class="random-dot"></div>');
                }
            }
        });

        $(".random-dot").each(function (i) {
            styleDot($(this));
            // add a transition delay to stagger boxes on initial load
            $(this)
                .get(0)
                .style.setProperty("--delay", i / 16 + "s");
            setTimeout(() => {
                $(this).get(0).style.setProperty("--delay", "0s");
            }, 2000);
            $(this).addClass("fadeIn");
        });
    }

    // Position dots based on height / width of body element (allowing them to flow down the entire page), subtracting 10px to avoid flowing off the right/bottom of the page, randomly apply border radius and grab colors from array

    function styleDot(dot) {
        // Position dot based on parent element width/height
        $(dot).css({
            top: $(dot).parent().height() * Math.random() - 10 + "px",
            left: $(dot).parent().width() * Math.random() - 10 + "px",
            background: colors[Math.floor(Math.random() * colors.length)],
            borderRadius: Math.floor(Math.random() * 2) * 100 + "%"
        });
    }

    freshDot();

    //move dots randomly on hover & toggle classnames in order to animate
    $(".random-dot").on("mouseover", function () {
        $(this).removeClass("fadeIn");
        setTimeout(() => {
            styleDot($(this));
            $(this).addClass("fadeIn");
        }, 250);
    });
});
