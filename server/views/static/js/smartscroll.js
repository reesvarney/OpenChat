class smartScroll{
    constructor(element){
        this.element = element;
    }

    //returns whether user is near bottom of element
    doesScroll(range){
        console.log()
        if(($(this.element).prop('scrollHeight') - ($(this.element).scrollTop() + $(this.element).height())) < range + 100 ) {
            return true;
        } else {
            return false;
        }
    };

    goToChild(child){
        var scrollTop = child.offset().top;
        this.element.scrollTop(scrollTop);
    }

    goToBottom(smooth){
        var scrollTop = this.element[0].scrollHeight;
        if(smooth){
            this.element.animate({
                scrollTop: scrollTop
            }, 500);
        } else {
            this.element.scrollTop(scrollTop);
        }
    }


}