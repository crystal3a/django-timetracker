var mouseState = false;
document.onmousedown = function (e) {
    mouseState = true;
}
document.onmouseup = function (e) {
    mouseState = false;
}

function dim () {

    $('#screen').css({
        background: "#000",
        display: "block",
        position: "absolute",
        top: 0,
        left: 0,
        opacity: 0.7,
        'width':$(document).width(),
        'height':$(document).height()
    });

    $("#pic").css({
        position: "fixed",
        top: "30%",
        left: "40%"
    });

    $("#pic").show();
};

function undim() {
    $("#pic").hide();
    $('#screen').css({
        display: "none",
        opacity: 0.0
    });
}
function applyClass(klass) {
    "use strict";
    /*
       Checks all the table elements,
       if they are selected, it removes the
       selected class (and all other classes)
       and applies the passed in class
    */

    $("#holiday-table")
        .find("td")
        .each(function () {
            if ($(this).hasClass("selected")) {
                $(this).removeClass();
                $(this).addClass(klass);
                js_calendar[parseInt($(this).attr("usrid"))][parseInt($(this).text())] = klass;
            }
        });
    return true;
}

function submit_all() {
    "use strict";
    dim();
    /*
       Submits all entries on the form

       Takes no parameters and returns true
       depending on success.
    */

    // setup our ajax properties
    $.ajaxSetup({
        type: 'POST',
        dataType: 'json'
    });

    $.ajax({
        url: '/ajax/',
        data: {
            'form_type': 'mass_holidays',
            'year': $("#holiday-table").attr("year"), // from the table header
            'month': $("#holiday-table").attr("month"),
            'mass_data': JSON.stringify(js_calendar)
        },
        success: function(data) {
            if (data.success === true) {
                alert("Holidays updated successfully");
            } else {
                alert(data.error);
            }
            change_table_data();
        },
        error: function(ajaxObj, textStatus, error) {
            alert(error);
        }
    });
    return true;
}

function submit_holidays(user_id) {
    "use strict";
    dim();
    /*
       En masse changes a set of holidays and
       takes a user_id as a parameter.

       Mass is true/false, if true it

       Returns true for success, false for error
    */

    if (!user_id) {
        return true;
    }

    // create a map to hold the holidays
    var daytypes = new Array()

    // iterate through the table and check if it's
    // selected or not, if it's selected, ignore it.
    // else, add the number and the class to the map.
    var x;
    for (x = 1; x < js_calendar[user_id].length; x++) {
        daytypes[x] = js_calendar[user_id][x];
    }

    // setup our ajax properties
    $.ajaxSetup({
        type: 'POST',
        dataType: 'json'
    });

    var holiday_map = {};
    holiday_map[user_id] = daytypes;
    $.ajax({
        url: '/ajax/',
        data: {
            'form_type': 'mass_holidays',
            'year': $("#holiday-table").attr("year"), // from the table header
            'month': $("#holiday-table").attr("month"),
            'mass_data': JSON.stringify(holiday_map)
        },
        success: function(data) {
            if (data.success === true) {
                alert("Holidays updated successfully");
            } else {
                alert(data.error);
            }
            change_table_data();
        },
        error: function(ajaxObj, textStatus, error) {
            alert(error);
        }
    });

    // return true so programmatic callers can
    // see we've completed
    return true;
}

function addFunctions () {
    "use strict";

    // all the daytype classes
    // are assigned a click handler which
    // swaps the colour depending on what
    // it currently is.
    $("#holiday-table")
        .find('.empty, .DAYOD, .TRAIN, '
            + '.WKDAY, .SICKD, .HOLIS, '
            + '.SPECI, .MEDIC, .PUABS, '
            + '.PUWRK, .SATUR, .RETRN, '
            + '.WKHOM, .OTHER, .ROVER, '
            + '.WKEND')
        .not(":button")
        .attr("unselectable", "on")   // make it so you can't select text
        .mouseover(function (e) {
            if (mouseState) {

                if ($(this).hasClass("selected")) {
                    $(this).removeClass("selected");
                } else {
                    $(this).addClass("selected");
                }
                e.preventDefault();
                e.stopPropagation();
            }
        })
        .mousedown(function (e) {
            if ($(this).hasClass("selected")) {
                $(this).removeClass("selected");
            } else {
                $(this).addClass("selected");
            }
        });

    $("#year_select").val($("#holiday-table").attr("year"));
    $("#month_select").val($("#holiday-table").attr("month"));
    $("#process_select").val($("#holiday-table").attr("process"));
    $("#employees-select, #day_options").change(function () {
        retrieveComments();
    });
    $("#year_select, #month_select, #process_select").change(function () {
        change_table_data();
    });

    $("#holiday-table")
        .attr("border", "1")

    return true;
}

function change_table_data () {

    /*
       Function which takes the values of the select boxes
       constructs an ajax call based on those and replaces
       the table with the data returned from the ajax call
    */

    var year = $("#year_select").val();
    var month = $("#month_select").val();
    var process = $("#process_select").val();

    if (process === "ALL") {
        process = "";
    }
    if (process == null) {
        process = "";
    }

    var url = [
        "/holiday_planning/", year,
        "/", month, "/", process
    ].join('');

    $.ajax({
        type: "GET",
        dataType: "HTML",
        url: url,
        success: function(data) {
            $("#holiday-wrapper, #comments-wrapper").fadeTo(500, 0, function() {
                /*
                  IE7 doesn't work with .html('<htmlstring>') so we use
                  the .load() function instead.
                */
                if ( $("#isie").attr("isie") === "true" ) {
                    $("#comments-wrapper").load(
                        url + " #com-field"
                    );
                    $("#holiday-wrapper").load(
                        url + " #holiday-table",
                        function() {
                            addFunctions();
                            retrieveComments();
                        });
                } else {
                    var holiday_html = $(data).find("#holiday-wrapper").html();
                    var comments_html = $(data).find("#comments-wrapper").html();
                    var table_year = $(data).find("#holiday-table").attr("year");
                    var table_month = $(data).find("#holiday-table").attr("month");
                    $("#com-field").html(comments_html);
                    $("#holiday-table").html(holiday_html);
                }
                $("#holiday-table").attr("year", table_year);
                $("#holiday-table").attr("month", table_month);
                addFunctions();
                $("#year_select").val(year);
                $("#month_select").val(month);
                if (process === "") {
                    $("#process_select").val("ALL");
                } else {
                    $("#process_select").val(process);
                }
                $(data).find("div").each(function() {
                    if ($(this).attr("id") === "newjs") {
                        eval($(this).text());
                    }
                });
                $("#holiday-wrapper, #comments-wrapper").fadeTo(500, 1);
            });
        }
    });
    undim();
    return true;
}

function removeComment() {
    "use strict";

    /*
      Function which removes a comment from the database for a specific
      tracking entry.
    */

    $.ajaxSetup({
        type: "POST",
        dataType: "json"
    });

    $.ajax({
        url: '/ajax/',
        data: {
            form_type: 'remove_comment',
            year: $("#holiday-table").attr("year"),
            month: $("#holiday-table").attr("month"),
            user: $("#user_select").val(),
            day: $("#day_options").val()
        },
        success: function (data) {
            if (data.success) {
                retrieveComments();
                change_table_data();
            } else {
                alert(data.error)
            }
        },
        error: function (data) {
            alert(data.error);
        }
    });

}

function insertComment() {
    "use strict";

    /*
      Function which inserts a comment into the database for a specific
      tracking entry.
    */

    $.ajaxSetup({
        type: "POST",
        dataType: "json"
    });

    $.ajax({
        url: '/ajax/',
        data: {
            form_type: 'add_comment',
            year: $("#holiday-table").attr("year"),
            month: $("#holiday-table").attr("month"),
            user: $("#user_select").val(),
            day: $("#day_options").val(),
            comment: $("#comments-field-comment").val()
        },
        success: function (data) {
            if (data.success) {
                retrieveComments();
                change_table_data();
            } else {
                alert(data.error)
            }
        },
        error: function (data) {
            alert(data.error);
        }
    });

}

function retrieveComments() {
    "use strict";

    /*
      Function which retrieves the comment associated with a tracking entry,
      this allows managers to apply a comment onto a field and edit the
      comments that they have already added onto a field by selecting the
      dates that they used it on.
    */

    $.ajaxSetup({
        type: "GET",
        dataType: "json"
    });

    $("#comments-field-comment").val('');

    $.ajax({
        url: '/ajax/',
        data: {
            form_type: 'get_comments',
            year: $("#holiday-table").attr("year"),
            month: $("#holiday-table").attr("month"),
            user: $("#user_select").val(),
            day: $("#day_options").val()
        },
        success: function (data) {
            if (data.success) {
                $("#comments-field-comment").val(data.comment);
            } else {
                alert(data.error)
            }
        },
        error: function(data) {
            alert(data.error);
        }
    });

    return true;

}

$(function () {
    "use strict";
    addFunctions();
    $("#pic").hide();
});
