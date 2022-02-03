// From https://gist.github.com/varemenos/2531765
// Originally from: http://jsfiddle.net/accuweaver/1vf6e465/

(function ($) {
    $.getUrlVar = function (key) {
        var result = new RegExp(key + "=([^&]*)", "i").exec(window.location.search);
        return result && unescape(result[1]) || "";
    };
})(jQuery);

/**
 * Stuff to execute after document is ready
 */
jQuery(document).ready(function ($) {

    function get_job(job, dep_id, text) {
        text += '<li class="roles-team_role" style="list-style-type:none;" id="' + job.id + '">';
        text += '<a class="roles-team_role-title" href="' + job.absolute_url + '" target="_blank"><h3 class="h5 u-mb-0">' + job.title + '</h3></a>';
        text += '<div class="roles-team_role-location">' + job.location.name + '</div>';
        text += '</li>';
        return text;
    }

    function get_department(dep, text, short) {
        if (!short) {
            text += '<li class="roles-team" id="' + dep.id + '">';
            text += '<div class="roles-team_title"><h2 class="h3">' + dep.name + '</h2></div>';
        }
        text += '<ul class="roles-team_role-wrapper">';
        if (dep.jobs.length) {
            $.each(dep.jobs, function (index, job) {
                text = get_job(job, dep.id, text);
            });
        } else {
            text += 'Sorry, we don\'t have open positions in this department.';
        }
        text += '</ul>';
        if (!short) {
            text += '</li>';
        }
        return text;
    }

    //BUILD A DROPDOWN OF DEPARTMENTS
    function build_select_of_departments(dep, text) {
        if (dep.jobs.length) {
            text += '<option value="' + dep.id + '">';
            text += dep.name;
            text += '</option>';
        }
        return text;
    }

    function get_all_jobs() {
        $.ajax({
            url: 'https://api.greenhouse.io/v1/boards/webflow/embed/departments',
            jsonp: 'callback',
            dataType: 'jsonp',
            success: function (deps) {
                var text = '';
                var select = '<div class="roles-select-wrapper"><label for="team" class="sr-only">Team</label><select class="input cc-select u-w-100" name="team"><option value="all" selected>All Teams</option>';
                text += '<ul id="departments">';
                $.each(deps.departments, function (index, dep) {
                    select = build_select_of_departments(dep, select);
                    if (dep.jobs.length) {
                        text = get_department(dep, text);
                    }
                });
                text += '</ul>';
                select += '</select></div>';
                $('.greenhouse-wrapper').empty().append(select);
                $('.greenhouse-wrapper').append(text).find('#departments').fadeOut(0).fadeIn();
            }
        });
    }

    var dim;
    if (!$.getUrlVar("gh_jid")) {
        //GET ALL JOBS
        get_all_jobs();
    } else {
        var dim = '<div id="wait" style="width: 100%; height: 100%; position: fixed; top: 0; z-index: 9000">';
        dim += '<img src="https://uploads-ssl.webflow.com/6052550fea8cd32aedd21459/6058e4858d298d0a1eed2a12_Ellipsis-2.6s-194px.gif" style="position: fixed; margin: auto; left: 0; right: 0; top: 0; bottom: 0"/>';
        dim += '</div>';
        console.log('has gh_id');
        $('body').append(dim).find('#wait').fadeOut(0).fadeIn(100);
        var check = setInterval(function () {
            if ($(document).find('#grnhse_div').length) {
                $('#grnhse_div').fadeOut(0).fadeIn(200);
                $('#wait').fadeOut(0);
                $('.greenhouse-wrapper').delay(1000).append(back_btn()).find('#back').fadeOut(0).delay(1000).fadeIn(200);
                clearInterval(check);
            }
        }, 50);
    }

    //SORT BY DEPARTMENT
    $('body').on('change', 'select', function () {
        if ($(this).attr('value') != 'all') {
            $.ajax({
                url: 'https://api.greenhouse.io/v1/boards/webflow/embed/department?id=' + $(this).attr('value'),
                jsonp: 'callback',
                dataType: 'jsonp',
                success: function (dep) {
                    var text = get_department(dep, '');
                    $('#departments').empty().append(text).fadeOut(0).fadeIn(200);
                }
            });
        } else {
            get_all_jobs();
        }
    });


    function api_department(id) {
        return $.ajax({
            url: 'https://api.greenhouse.io/v1/boards/webflow/embed/department?id=' + id,
            jsonp: 'callback',
            dataType: 'jsonp'
        });
    }
    console.log($.getUrlVar("dep"));
    if ($.getUrlVar("dep")) {
        console.log("dep = '" + $.getUrlVar("dep"));
        $.ajax({
            url: 'https://api.greenhouse.io/v1/boards/webflow/embed/job?id=' + $.getUrlVar("gh_jid") + '',
            jsonp: 'callback',
            dataType: 'jsonp',
            timeout: 1000,
            error: function () {
                api_department($.getUrlVar("dep")).done(function (dep) {
                    var check = setInterval(function () {
                        if ($(document).find('#grnhse_div').length && $('#grnhse_div').height() < 300) { //if request timed out there is still a chance that server had a delay etc. If position doesn't exist the iframe returns only text and is only 1278px in height. So I make sure that I frame is small which confirms that position wasn't found.
                            $('#grnhse_app').fadeOut(0);
                            var text = '<div id="sorry">';
                            text += '<h3 style="margin-top: 0">Sorry, this position doesn\'t exist anymore</h3>';
                            text += '<p>Please take a look at the available positions in the <b>' + dep.name + '</b> department</p>';
                            text += get_department(dep, '', true);
                            text += '</div>';
                            $('.greenhouse-wrapper').append(text);
                            clearInterval(check);
                        }
                    }, 50);
                });
            }
        });
    }

});