module('calendar');

test("test-drop-on-day", function() {
    equals(0, 1, "Make sure this is working.");
    //equals(jQuery('#content').html(), "Some Content", "Assert that we get the content of a div with an ID.");
});

test("test-click-day", function() {
    var element = $('<div></div>');
    element.text('Hello World!');
    element.attr('id', 'foobar');
    $('body').append(element);
    var test = $('#foobar');
    equals($('#foobar').text(), "Hello World!", "Created element with jQuery added it to DOM and pulled it out.");
});