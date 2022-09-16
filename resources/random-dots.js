$(function () {
    var totalDots,
        colors = [
        "#DCDCDC",
        "#898989",
        "#FFD2A1",
        "#FFB800",
        "#FF6D00",
        "#FF0000",
        "#B22000",
        "#934343",
        "#EAFF68",
        "#FEFF01",
        "#AA9B00",
        "#BBF471",
        "#7FAC00",
        "#028D00",
        "#374000",
        "#BDE5D7",
        "#38D996",
        "#726649",
        "#5B717F",
        "#008181",
        "#0E3E1B",
        "#0089B5",
        "#8F85DA",
        "#8BC7FF",
        "#7056F5",
        "#A30091",
        "#6A1891",
        "#FFE7E5",
        "#FFB6F3",
        "#FFAB9D",
        "#FF9BBD",
        "#F460FF"
    ];

    function freshDot() {
        // Append dots to sections if data-dots attribute is present otherwise append to body
        if ($("section").length) {
            $("section").each(function () {
                if ($(this).attr("data-dots")) {
                    totalDots = $(this).attr("data-dots");
                } else {
                    // if the data attribute is not present in the section, append dots with count based on the height of the section
                    totalDots = Math.round($(this).height() / 100);
                }
                for (var i = 0; i < totalDots; i++) {
                    $(this).append('<div class="box"></div>');
                }
            });
        } else {
            // if no sections are present, append dots to the body with a count based on heighto of body content
            totalDots = $("body").height() / 100;
            for (var i = 0; i < totalDots; i++) {
                $("body").append('<div class="box"></div>');
            }
        }
        $(".box").each(function (i) {
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
    $(".box").on("mouseover", function () {
        $(this).removeClass("fadeIn");
        setTimeout(() => {
            styleDot($(this));
            $(this).addClass("fadeIn");
        }, 250);
    });
});
