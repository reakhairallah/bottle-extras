<?php

// raw ingredients used by seeders.php to build fake demo data.
// no database code here at all - just plain arrays to pick from.

$adjectives = ["Quiet", "Salty", "Drifting", "Hidden", "Lonely", "Restless", "Faded", "Gentle", "Weary", "Distant"];
$nouns = ["Harbor", "Wave", "Compass", "Tide", "Shore", "Anchor", "Current", "Horizon", "Lighthouse", "Reef"];

// each bottle owns its own marks, so the marks actually relate to what
// the bottle says - some bottles have none, some have a few
$bottles = [
    ["content" => "I told everyone I got the internship. I didn't.", "marks" => ["i've been there, it's rough", "your secret's safe with the ocean"]],
    ["content" => "I still eat cereal for dinner more nights than I'd like to admit.", "marks" => ["honestly a solid meal choice", "no judgment here, cereal is underrated"]],
    ["content" => "I've rewatched the same show four times because starting something new feels like too much effort.", "marks" => ["comfort over novelty, always"]],
    ["content" => "I said 'you too' when the waiter told me to enjoy my meal.", "marks" => ["we've all done this", "the wave of regret is real"]],
    ["content" => "I laughed at the joke but I didn't get it.", "marks" => []],
    ["content" => "I have 47 unread emails and I've made peace with it.", "marks" => ["47 is rookie numbers honestly", "the peace is the real achievement"]],
    ["content" => "I practiced the apology in the mirror and never actually sent it.", "marks" => ["send it, i promise it helps"]],
    ["content" => "I still remember my childhood best friend's phone number but not my own.", "marks" => ["some numbers just stick", "you should call it sometime"]],
    ["content" => "I told my group chat I was 'so busy' and then took a three hour nap.", "marks" => ["the most productive lie"]],
    ["content" => "I cried at a car commercial last week. A CAR commercial.", "marks" => ["they're getting really good at those"]],
    ["content" => "I finally fixed the thing that's been broken for six months and I feel unstoppable.", "marks" => ["that feeling is unmatched", "what was it, i need the same high"]],
    ["content" => "I talk to my plants and I'm convinced one of them talks back.", "marks" => ["which one, i need to know"]],
    ["content" => "I got the job I actually wanted and I still can't believe it.", "marks" => ["congratulations, genuinely", "you earned this"]],
    ["content" => "I pretend I know what's happening in meetings by nodding a lot.", "marks" => ["the universal survival skill"]],
    ["content" => "I danced alone in my kitchen tonight and it was the best part of my week.", "marks" => ["this is the whole point of kitchens"]],
    ["content" => "I've had the same 'I'll start tomorrow' plan for two years now.", "marks" => []],
    ["content" => "I deleted the app three times and reinstalled it three times.", "marks" => ["the loop we all know", "at least you're consistent"]],
    ["content" => "I wore mismatched socks to an interview and got the job anyway.", "marks" => ["clearly the socks were a good luck charm"]],
    ["content" => "I said yes to something I didn't want to do just to avoid an awkward silence.", "marks" => ["it's okay to just say no next time"]],
    ["content" => "I finally said the hard thing out loud and nothing bad happened.", "marks" => ["that takes real courage", "i needed to hear this today"]],
    ["content" => "I'm proud of myself today and I don't say that enough.", "marks" => ["say it more often, you deserve it", "proud of you too"]],
    ["content" => "I once returned to a store three times because I was too nervous to ask a question.", "marks" => ["the customer service anxiety is real"]],
    ["content" => "I still have a voicemail I can't bring myself to delete.", "marks" => ["that's okay, keep it as long as you need"]],
    ["content" => "I made a five year plan and immediately fell asleep thinking about it.", "marks" => []],
    ["content" => "I gave a stranger my umbrella and thought about it happily for the rest of the day.", "marks" => ["small kindnesses stick with you", "this made my day just reading it"]],
    ["content" => "I still have the tag on a shirt I bought eight months ago.", "marks" => ["wear it or return it, no in between"]],
    ["content" => "I told my roommate I was asleep so I didn't have to talk.", "marks" => ["introvert survival tactics", "we've all faked it at some point"]],
    ["content" => "I clapped when the plane landed and nobody else did.", "marks" => ["someone has to start the tradition"]],
    ["content" => "I've had a plant on my desk for a year and I still don't know what kind it is.", "marks" => ["it's thriving under mystery care"]],
    ["content" => "I called in sick to finish a book I couldn't put down.", "marks" => ["worth it if the book was good", "no shame, the book always wins"]],
    ["content" => "I practiced my order out loud before walking into the coffee shop.", "marks" => ["we've all rehearsed a coffee order"]],
    ["content" => "I finally paid off my credit card and did a little dance about it.", "marks" => ["that dance was earned", "financial wins deserve a celebration"]],
    ["content" => "I still think about a comment someone made about my hair three years ago.", "marks" => ["it lives rent free, i understand completely"]],
    ["content" => "I pretended to know a shortcut and got us both lost for twenty minutes.", "marks" => ["confidence over accuracy, i respect it"]],
    ["content" => "I read the last page of the book first because I couldn't handle the suspense.", "marks" => ["valid strategy honestly"]],
    ["content" => "I stayed up too late finishing a project and it turned out better than anything I've made rushing.", "marks" => ["sometimes the pressure works in our favor"]],
    ["content" => "I told a coworker I loved their idea in the meeting when I completely zoned out.", "marks" => ["classic meeting survival", "we've all nodded through a zone-out"]],
    ["content" => "I've kept a plant alive for six months and consider it a major life achievement.", "marks" => ["it is one, don't let anyone tell you otherwise"]],
    ["content" => "I waved back at someone who wasn't waving at me.", "marks" => ["the wave commitment is the hardest part", "we've all had to play it off"]],
    ["content" => "I finally called my grandmother back and we talked for two hours.", "marks" => ["this made me want to call mine too"]],
    ["content" => "I pretended not to see my ex at the grocery store and hid in the cereal aisle.", "marks" => ["the cereal aisle is a safe haven"]],
    ["content" => "I wrote a to-do list just to have the satisfaction of crossing something off immediately.", "marks" => ["the dopamine hit is real", "no shame, it works"]],
    ["content" => "I laughed so hard at something dumb that I cried in public.", "marks" => ["those are the best kind of laughs"]],
    ["content" => "I still remember exactly what song was playing during a good memory from years ago.", "marks" => ["music really holds onto things for us", "which song, i'm curious now"]],
    ["content" => "I complimented a stranger's outfit and made both our days better.", "marks" => ["this is exactly the kind of thing the world needs more of"]],
    ["content" => "I finally organized my closet and found three things I forgot I owned.", "marks" => ["closet archaeology is always a surprise"]],
    ["content" => "I've had the same ringtone since 2014 and I refuse to change it.", "marks" => ["some things shouldn't change, honestly", "at least you always know it's your phone"]],
    ["content" => "I remembered an embarrassing thing I did in middle school at 2am for no reason.", "marks" => ["the 2am memory ambush is brutal"]],
    ["content" => "I finally tried the recipe I bookmarked a year ago and it actually turned out great.", "marks" => ["a year is basically right on schedule", "so proud of past you for bookmarking it"]],
    ["content" => "I let myself rest today without feeling guilty about it and it felt like a small victory.", "marks" => ["rest is productive too, good for you"]]
];

?>
