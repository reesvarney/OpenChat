class smartScroll{
    constructor(element){
        this.element = element;
        this.scrolling = false;
        this.scrollDestination;
    }

    //returns whether user is near bottom of element
    doesScroll(range){
        let source = (this.scrolling) ? this.scrollDestination : $(this.element).scrollTop();
        if(($(this.element).prop('scrollHeight') - (source + $(this.element).height())) < range + 100 ) {
            return true;
        } else {
            return false;
        }
    };

    goToChild(child){
        this.scrollDestination = child.offset().top;
        this.element.scrollTop(this.scrollDestination);
    }

    goToBottom(smooth=true){
        this.scrollDestination = this.element[0].scrollHeight;
        if(smooth){
            this.scrolling = true;
            this.element.animate({
                scrollTop: this.scrollDestination
            }, 500, ()=>{
                this.scrolling = false;
            });
        } else {
            this.element.scrollTop(this.scrollDestination);
        }
    }


}