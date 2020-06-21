// Requires index.html for prompting.
// (c) 2018

function MusicHelperObject()
{
    this.promptForSong = function()
    {
        var songWindow = SubWindowHelper.create({ title: "Song Creator" });
    };
}

var MusicHelper = new MusicHelperObject();
