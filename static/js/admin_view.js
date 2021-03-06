/*global $*/
/* 
   Functions to deal with the client-side
   actions of the administrator view
*/

function onOptionChange(date) {
	"use strict";
    /*
      Function triggers the change in the
      calendar on the template to show the
      calendar body
    */

    $.ajaxSetup({type: 'POST'});

    var eeid = $("#user_select").val();

    $.ajax({
        url: "/ajax/",
        dataType: 'json',
        data: {
            'form_type': 'admin_get',
            'eeid': eeid
        },
        success: function (data) {
            $("#calendar_div").html(data.calendar);
            $("#calendar tr td a").attr("href", "#");
            $("#calendar tr td a").css({'color': 'black'});
        }
    });
    return true;
}

function toggleChangeEntries(st_hour, st_min, full_st,
                             fi_hour, fi_min, full_fi,
                             entry_date, daytype,
                             change_id, breakLength,
                             breakLength_full) {

    "use strict";

    var start_string = "Start Time: " + full_st,
	    end_string = " | End Time: " + full_fi,
	    hours = 0,
	    minutes = 0,
	    str_hours = '',
        str_mins = '';

    function pad(str, length, chr) {
        str = String(str);
        if (str.length < length) {
            var pad_string = '';
            while ((pad_string + str).length < (length)) {
                pad_string = chr + pad_string;
            }
            str = pad_string + str;
        }
        return str;
    }

    hours = fi_hour - st_hour;
    minutes = (fi_min - st_min);

    if (minutes < 0) {
        minutes = minutes + 60;
        hours = hours - 1;
    }

    str_hours = pad(hours, 2, '0');
    str_mins = pad(minutes, 2, '0');

    $("#day_information")
        .fadeTo(200, 0.1, function () {
            $("#start_time").text("Start: " + full_st);
            $("#end_time").text("End: " + full_fi);
            $("#shiftlength").text("Shift Length: " + str_hours + ':' + str_mins);
            $("#breaks").text("Breaks: " + breakLength_full);
        });
    $("#day_information")
        .fadeTo(200, 1);
}

function hideEntries() {
	"use strict";
    $("#day_information").fadeTo(200, 0);
}

$(function () {
	"use strict";

    $("#user_select").change(function () {
        onOptionChange();
    });
    onOptionChange();
    $("#day_information").hide();
});
