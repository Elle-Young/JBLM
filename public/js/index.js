'use strict';

// Credit: https://css-tricks.com/snippets/jquery/simple-auto-playing-slideshow/
$('#slideshow > div:gt(0)').hide();

setInterval(function() {
  $('#slideshow > div:first')
    .fadeOut(2000)
    .next()
    .fadeIn(2000)
    .end()
    .appendTo('#slideshow');
}, 8000);

function loadData() {
  $.get('/upcoming/5', calendarItems => {
    const section = $('#upcoming');
    calendarItems.forEach(event => {
      let pEl = $('<p class="upcoming-item"></p>');
      let dateEl = $('<span class="upcoming-date"></span>');
      let startTimeEl = $('<span class="upcoming-start-time"></span>');
      let endTimeEl = $('<span class="upcoming-end-time"></span>');
      let titleEl = $('<span class="upcoming-title"></span>');
      dateEl.text(event.date);
      titleEl.text(event.eventTitle);
      startTimeEl.text(event.start);
      endTimeEl.text(event.end);
      pEl.append(dateEl);
      pEl.append(startTimeEl);
      pEl.append(endTimeEl);
      pEl.append(titleEl);
      section.append(pEl);
    });
  });
}

// function loadNews() {
//   $.get('/nytimes/news', newsArray => {
//     const section = $('#news');
//     newsArray.forEach(news => {
//       console.log('THIS IS NEWS ARRAY =====:', news);
//       let articleElement = $('<article></article>');
//       let newsTitle = $('<h5 class= "newstitle"></h5>');
//       newsTitle.text(news.title);
//       let newsUpdated = $('<p class="newstime"></p>');
//       newsUpdated.text(news.updated);
//       let newsAbstract = $('<p class= "newsinfo"></p>');
//       newsAbstract.text(news.summary);
//       let newsLink = news.url;
//       let newsURL = $( `<a class="newsurl" href="${newsLink}">See more about this news</a>`);
//       articleElement.append(newsTitle);
//       articleElement.append(newsUpdated);
//       articleElement.append(newsAbstract);
//       articleElement.append(newsURL);
//       section.append(articleElement);
//     });
//   });
// }


$().ready(loadData);
// $().ready(loadNews);
