"""
Module for collecting the utility functions dealing with mostly calendar
tasks, processing dates and creating time-based code.
"""

import datetime
import calendar as cdr

from django.http import Http404, HttpResponse
from django.db import IntegrityError

import simplejson

from timetracker.tracker.models import TrackingEntry, Tbluser
from timetracker.utils.database_errors import *

MONTH_MAP = {
    0: ('JAN', 'January'),
    1: ('FEB', 'February'),
    2: ('MAR', 'March'),
    3: ('APR', 'April'),
    4: ('MAY', 'May'),
    5: ('JUN', 'June'),
    6: ('JUL', 'July'),
    7: ('AUG', 'August'),
    8: ('SEP', 'September'),
    9: ('OCT', 'October'),
    10:('NOV', 'November'),
    11:('DEC', 'December')
}

def pad(string, pad='0', amount=2):
    """
    Pads a string
    """
    string = str(string)

    if len(str(string)) < amount:
        pre =  pad * (amount - len(string))
        return pre+string

    return string

def parse_time(timestring, type=int):

    """
    Given a time string will return a tuple of ints,
    i.e. "09:44" returns (9, 44) with the default args,
    you can pass any function to the type argument.
    """
    
    return map(type, timestring.split(":"))

def gen_calendar(year=datetime.datetime.today().year,
                 month=datetime.datetime.today().month,
                 day=datetime.datetime.today().day,
                 user=None):

    """
    Returns a HTML calendar, calling a database user to get their day-by-day
    entries and gives each day a special CSS class so that days can be styled
    individually.

    The generated HTML should be 'pretty printed' as well, so the output code
    should be pretty readable.
    """

    # django passes us Unicode strings
    year, month, day = int(year), int(month), int(day)

    if month-1 not in MONTH_MAP.keys():
        raise Http404

    # if we've generated December, link to the next year
    if month + 1 == 13:
        next_url = '"/calendar/%s/%s"' % (year + 1, 1)
    else:
        next_url = '"/calendar/%s/%s"' % (year, month + 1)

    # if we've generated January, link to the previous year
    if month - 1 == 0:
        previous_url = '"/calendar/%s/%s"' % (year - 1, 12)
    else:
        previous_url = '"/calendar/%s/%s"' % (year, month - 1)


    # need to use authorisation and sessions to get this
    # for testing we'll just grab the same db object
    database = Tbluser.objects.get(user_id__exact=user)

    # pull out the entries for the given month
    try:
        database = TrackingEntry.objects.filter(
            user=database.id,
            entry_date__year=year,
            entry_date__month=month
            )

    except TrackingEntry.DoesNotExist:
        # it seems Django still follows through with the assignment
        # when it raises an error, this is actually quite good because
        # we can treat the query set like normal
        pass

    # create a semi-sparsely populated n-dimensional
    # array with the month's days per week
    calendar_array = cdr.monthcalendar(
        int(year),
        int(month)
    )

    # creating a list holder for the strings
    # this is faster than concatenating the
    # strings as we go.
    cal_html = list()
    to_cal = cal_html.append

    # create the table header
    to_cal("""<table id="calendar" border="1">\n\t\t\t""")

    to_cal("""<tr>
                <td class="table-header" colspan="2">
                  <a class="table-links" href={0}>&lt;</a>
                </td>

                <td class="table-header" colspan="3">{2}</td>

                <td class="table-header" colspan="2">
                  <a class="table-links" href={1}>&gt;</a>
                </td>
              </tr>\n""".format(previous_url,
                                next_url,
                                MONTH_MAP[int(month)-1][1]
                        )
           )

    # insert day names
    to_cal("""\n\t\t\t<tr>
                <td class=day-names>Mon</td>
                <td class=day-names>Tue</td>
                <td class=day-names>Wed</td>
                <td class=day-names>Thu</td>
                <td class=day-names>Fri</td>
                <td class=day-names>Sat</td>
                <td class=day-names>Sun</td>
              </tr>\n""")

    # each row in the calendar_array is a week
    # in the calendar, so create a new row
    for week_ in calendar_array:
        to_cal("""\n\t\t\t<tr>\n""")

        for _day in week_:

            # the calendar_array fills extraneous days
            # with 0's, we can catch that and treat either
            # end of the calendar differently in the CSS
            if _day != 0:
                emptyclass = 'day-class empty-day'
            else:
                emptyclass = 'empty'

            # we've got the month in the query set,
            # so just query that set for individual days
            try:
                # get all the data from our in-memory query-set.
                data = database.get(entry_date__day=_day)

                # Pass these to the page so that the jQuery functions
                # get the function arguments to edit those elements
                vals = [
                    data.start_time.hour,
                    data.start_time.minute,
                    str(data.start_time)[0:5],
                    data.end_time.hour,
                    data.end_time.minute,
                    str(data.end_time)[0:5],
                    data.entry_date,
                    data.daytype,
                    _day,
                    data.id
                    ]

                to_cal("""\t\t\t\t
                       <td onclick="toggleChangeEntries({0}, {1}, '{2}',
                                                        {3}, {4}, '{5}',
                                                        '{6}', '{7}', {9})"
                           class="day-class {7}">{8}</td>\n""".format(*vals)
                       )

            except TrackingEntry.DoesNotExist:

                # For clicking blank days to input the day quickly into the
                # box. An alternative to the datepicker
                if _day != 0:
                    entry_date_string = '-'.join(map(pad, [year, month, _day]))
                else:
                    entry_date_string = ''

                # we don't want to write a 0 in the box
                _day = '&nbsp' if _day == 0 else _day

                # write in the box and give the empty boxes a way to clear
                # the form
                to_cal("""\t\t\t\t<td onclick="hideEntries('{0}')"
                              class="{1}">{2}</td>\n""".format(entry_date_string,
                                                               emptyclass,
                                                               _day))

        # close up that row
        to_cal("""\t\t\t</tr>\n""")

    # close up the table
    to_cal("""\n</table>""")

    # join up the html and push it back
    return ''.join(cal_html)

def json_response(f):

    """
    Decorator function that when applied to a function which
    returns some json data will be turned into a HttpResponse

    This is useful because the call site can literally just
    call the function as it is without needed to make a http-
    response.
    """
    
    def inner(args):
        return HttpResponse(simplejson.dumps(f(args)),
                            mimetype="application/javscript")
    return inner    
    
@json_response
def ajax_add_entry(request):

    '''
    Adds a calendar entry asynchronously
    '''

    # create objects to put our data into
    json_data = dict()

    # object to dump form data into
    form = {
        'entry_date': None,
        'start_time': None,
        'end_time': None,
        'daytype': None,
    }

    # get our form data
    for key in form:
        form[key] = request.POST.get(key, None)

    
    # This should be on the page
    try:
        shour, sminute = parse_time(form['start_time'])
        ehour, eminute = parse_time(form['end_time'])
    except ValueError:
        json_data['error'] = 'Date Error'
        return json_data
        
    if (datetime.time(shour, sminute) > datetime.time(ehour, eminute)):
        json_data['error'] = "Start time after end time"
        return json_data

    # SESSIONS
    form['user_id'] = 1
    # need to add a breaks section to the form
    form['breaks'] = "00:15:00"

    try:
        # this will be ok as soon as I put client side validation
        # and server side validation working.
        entry = TrackingEntry(**form)
        entry.save()

        year, month, day = map(int,
                               form['entry_date'].split("-")
                           )
        # again, sessions
        calendar = gen_calendar(year, month, day,
                                user='aaron.france@hp.com')

    except IntegrityError as error:
        if error[0] == DUPLICATE_ENTRY:
            json_data['error'] = "There is a duplicate entry for this value"
        else:
            json_data['error'] = str(error)
        return json_data
        
    # if all went well
    json_data['success'] = True
    json_data['calendar'] = calendar
    return json_data

@json_response
def ajax_change_entry(request):
    """
    Asynchronously changes an entry
    """
    raise NotImplemented

@json_response
def ajax_delete_entry(request):
    """
    Asynchronously deletes an entry
    """

    if not request.is_ajax():
        raise Http404

    form = {
        'hidden-id': None,
        'entry_date': None
    }

    json_data = {
        'success': False,
        'error': '',
        'calendar': ''
    }
    
    # get our form data
    for key in form:
        form[key] = request.POST.get(key, None)

    year, month, day = map(int,
                           form['entry_date'].split("-")
                           )

    if form['hidden-id']:
        try:
            entry = TrackingEntry(id=form['hidden-id'])
            entry.delete()
        except Exception as e:
            json_data['error'] = str(e)
            return json_data

    # again, sessions
    calendar = gen_calendar(year, month, day,
                            user='aaron.france@hp.com')
    
    # if all went well
    json_data['success'] = True
    json_data['calendar'] = calendar
    return json_data    
    
@json_response
def ajax_error(error):
    return {
        'success': False,
        'error': error
        }
