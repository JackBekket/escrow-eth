
$(function(){
    var ajaxBlocker = false;
    // ### Functions ###
    function findId(arrays, id){
        for (var i in arrays){
            if (arrays[i][0] == id) return i;
        }
    }

    function isCanPay(userTO ){
        if( getAccount() == userTO)
            return ' <button id="payInvoice" class="ui secondary negative button payer">Pay Invoice </button>';
        return "";

    }
    function isCanAccept(userFrom ){
        if( getAccount() == userFrom)
            return '  <button id="acceptContract" class="ui secondary negative button acceptor">Accept Contract</button>';
        return "";

    }




    function getAccount(){
        var account = $.trim($('#accountsDrop .text').text());
        var res;
        switch(account){
            case "Elliot":
                res = 1;
                break;
            case "Joe":  
                res = 0;
                break;
            case "Laura":
                res = 2;
                break;
            case "Christian":
                res = 3;
                break;
        }
        return res;
    }

    $('#accountsDrop').dropdown();


    function formatTime(unixTime){
        var date = new Date(unixTime*1000);
        // Hours part from the timestamp
        var hours = date.getHours();
        // Minutes part from the timestamp
        var minutes = "0" + date.getMinutes();
        // Seconds part from the timestamp
        var seconds = "0" + date.getSeconds();
        // Will display time in 10:30:23 format
        var formattedTime = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
        return formattedTime;
    }

    function fetchContracts(){
        $.ajax({
            type: 'GET',
            url: '/read_db',
            success: function(_contracts){
console.log(_contracts)

                contracts = _contracts; // caching the contracts
                $contracts.empty(); // clean the table before refresh
                 $contracts_by_user.empty(); // clean the table before refresh
                $.each(_contracts,function(i, _contract){
                    i++;
                    var $status;
                    var $accountLogoFrom;
                    var $accountLogoTo;
                    if (_contract[3] === '0x0'){
                        // Loading Status
                        $status = `<div class="ui active inline loader"></div>`;
                    }
                    else {
                        // Deployed Status
                        $status = `<div class="ui steps">
                                      <div class="completed step">
                                        <i class="payment icon"></i>
                                        <div class="content">
                                          <div class="title">Deployed</div>
                                          <div class="description">Mined and deployed</div>
                                        </div>
                                      </div>
                                  </div>`;
                    }

//var accountToId=Math.floor(Math.random() * 3) + 0; 

var accountToId=parseInt(_contract[5]) + 1; 

if(accountToId == 4){

//accountToId=2;

}

  switch (parseInt(_contract[6])) {
                        case 1:
                            $accountLogoTo = '<img class="ui avatar image" src="css/themes/default/assets/images/elliot.jpg">'
                            break;
                        case 0:
                            $accountLogoTo = '<img class="ui avatar image" src="css/themes/default/assets/images/joe.jpg">'
                            break;
                        case 2:
                            $accountLogoTo = '<img class="ui avatar image" src="css/themes/default/assets/images/stevie.jpg">'
                            break;
                        case 3:
                            $accountLogoTo = '<img class="ui avatar image" src="css/themes/default/assets/images/christian.jpg">'
                            break;
                    }

  

  
                    switch (parseInt(_contract[5])) {
                        case 1:
                            $accountLogoFrom = '<img class="ui avatar image" src="css/themes/default/assets/images/elliot.jpg">'
                            break;
                        case 0:
                            $accountLogoFrom = '<img class="ui avatar image" src="css/themes/default/assets/images/joe.jpg">'
                            break;
                        case 2:
                            $accountLogoFrom = '<img class="ui avatar image" src="css/themes/default/assets/images/stevie.jpg">'
                            break;
                        case 3:
                            $accountLogoFrom = '<img class="ui avatar image" src="css/themes/default/assets/images/christian.jpg">'
                            break;
                    }


//testing begins

/*console.log(getAccount())
console.log(parseInt(_contract[5]))
console.log(parseInt(_contract[6]))*/

                    // Append fetched contracts to table.
             //   if((getAccount() == parseInt(_contract[5]))|| (getAccount() == parseInt(_contract[6])))

  //              {
                    $contracts.append(`
                        <tr>
                            <td>${_contract[0]}</td>
                            <td>${_contract[1]}</td>
                            <td>
                                <button class="ui primary button checkInfo" style="margin-right:2em;">View State</button>
                                <button class="ui primary negative button changeInfo">Change State</button>
                            </td>
                            <td>${$status}</td>
                            <td>${$accountLogoFrom}</td>
                            <td>${$accountLogoTo}</td>
                        </tr>`
                    );
//}
//testing ends



//testing begins
                    // Append fetched contracts to table.
if((getAccount() == parseInt(_contract[5]))|| (getAccount() == parseInt(_contract[6]))){

/*
if(getAccount() == parseInt(_contract[6])){

     $('.acceptor').hide();
}
else if(getAccount() == parseInt(_contract[5])){

    $('.payer').hide();
} */

                    $contracts_by_user.append(`
                        <tr>
                            <td>${_contract[0]}</td>
                            <td>${_contract[1]}</td>
                            <td>
                                <button class="ui primary button checkInfo" style="margin-right:2em;">View State</button>
                                <button class="ui primary negative button changeInfo">Change State</button>
                            </td>
                            <td>${$status}</td>
                            <td>${$accountLogoFrom}</td>
                            <td>${$accountLogoTo}</td>
                        </tr>`
                    );
}
//testing ends


                });
            }
        });
    }

    // ##### LOGIC #####

    var $contracts = $('#contracts'); // Gets table body
    var $contracts_by_user=$('#contracts_by_user'); // Gets table body
    var contracts; // array cache of fetched contracts from database


    // #### Fetch contracts logic ###
    fetchContracts();
    setInterval(function(){
        fetchContracts();
    },3000);

    // ### Contract calls ###
    $('tbody').on('click','.checkInfo',function(){
        // Cache contract ID from table
        var $cId = parseInt($(this).parent().prev().prev().html());
        var $logo = $(this).parent().next().next().html();
        // Cache contract name from table
        var $cName = $(this).parent().prev().html();
        // Fill the modal head with contract's name
        $('#modalCheck').find('.header').html($cName);
        // Get the selected contract index in contracts array
        var absIndex = findId(contracts, $cId);

        $('#modalCheck .header .content').off();


        if($cName === "EscrowContract"){
            // Fill the modal
            var $modalContent = `
                <div style="text-align:center;">
                    <p>Contract's address: ${contracts[absIndex][3]}</p>
                    <p>Last update time: ${formatTime(contracts[absIndex][4])}</p>
                </div>
                <div style="text-align:center;margin-top:2em;">
                    <h4>Show Information</h4>

            <button id="getInit" class="ui primary button">Get Init</button>
            <button id="getConsent" class="ui primary button">Get Consent</button>
            <button id="getDeposit" class="ui primary button">Get Deposit</button>
                    
                </div>
                <div style="margin-top:2em;min-height:18em;"
                class="ui inverted segment">
                    <h3 style="text-align:center;">Contract's output zone</h3>
                    <div id="callOutput" style="text-align:center;"></div>
                </div>`;
            $('#modalCheck').find('.content').html($modalContent);


            // ### Modal buttons ###
            // getInit Call
            $('#modalCheck').on('click','#getInit',function(){
                $('#callOutput').empty();
                if (!ajaxBlocker){
                    ajaxBlocker = true;
                    $.ajax({
                        type: 'GET',
                        url: '/callContract',
                        data: {
                            abi: contracts[absIndex][2],
                            address: contracts[absIndex][3],
                            func: 'getInit',
                            account: getAccount()
                        },
                        success: function(_datas){
                            ajaxBlocker = false;
                            $.each(_datas,function(i,_data){
                                switch(i){
                                    case 0:
                                        i = 'Sender Address';
                                        _data = `${_data} `+$logo;
                                        break;
                                    case 1:
                                        i = 'Contract\'s account balance';
                                        break;
                                    case 2:
                                        i = 'Contract\'s creation time';
                                        _data = formatTime(_data);
                                        break;
                                    case 3:
                                        i = 'Contract\'s ending time (not operational)';
                                        _data = formatTime(_data);
                                        break;
                                    case 4:
                                        i = 'Cryptographically signed creation time';
                                        break;
                                    default:
                                        break;
                                }
                                $('#callOutput').append(`
                                    <p><strong>${i}:</strong> <span style="color:cyan;">${_data}</span></p>`
                                );
                            });
                            return true;
                        },
                        error: function(){
                            console.log('ERROR IN AJAX');
                            return false;
                        }
                    });
                }
            });

            // getConsent Call
            $('#modalCheck').on('click','#getConsent',function(){
                $('#callOutput').empty();
                if (!ajaxBlocker){
                    ajaxBlocker = true;
                    $.ajax({
                        type: 'GET',
                        url: '/callContract',
                        data: {
                            abi: contracts[absIndex][2],
                            address: contracts[absIndex][3],
                            func: 'getConsent',
                            account: getAccount()
                        },
                        success: function(_datas){
                            ajaxBlocker = false;
                            $('#callOutput').append('<p style="color:red;"><i>This is your consent (zero if no consent given)</i></p>')
                            $.each(_datas,function(i,_data){
                                switch(i){
                                    case 0:
                                        i = 'Acceptant\'s Address';
                                        break;
                                    case 1:
                                        i = 'Accepted time';
                                        _data = formatTime(_data);
                                        break;
                                    case 2:
                                        i = 'Cryptographically signed accepted time';
                                        break;
                                    case 3:
                                        i = 'Message of the Acceptant';
                                        break;
                                }
                                $('#callOutput').append(`
                                    <p><strong>${i}:</strong> <span style="color:cyan;">${_data}</span></p>`
                                );
                            });
                        }
                    });
                }
            });

            // getDeposit Call
            $('#modalCheck').on('click','#getDeposit',function(){
                $('#callOutput').empty();
                if (!ajaxBlocker){
                    ajaxBlocker = true;
                    $.ajax({
                        type: 'GET',
                        url: '/callContract',
                        data: {
                            abi: contracts[absIndex][2],
                            address: contracts[absIndex][3],
                            func: 'getDeposit',
                            account: getAccount()
                        },
                        success: function(_data){
                            ajaxBlocker = false;
                            i = 'Your deposit';
                            $('#callOutput').html(`
                                <p><strong>${i}:</strong> <span style="color:cyan;">${_data}</span></p>`
                            );
                        }
                    });
                }
            });
        } // end EscrowContract

        else if ($cName === "InvoiceContract"){
            // Fill the modal
            var $modalContent = `
                <div style="text-align:center;">
                    <p>Contract's address: ${contracts[absIndex][3]}</p>
                    <p>Last update time: ${formatTime(contracts[absIndex][4])}</p>
                </div>
                <div style="text-align:center;margin-top:2em;">
                    <h4>Show Information</h4>

                    <button id="getInit" class="ui primary button">Get Init</button>
                    <button id="getConsent" class="ui primary button">Get Consent</button>
                    <button id="getInvoice" class="ui primary button">Get Invoice</button>
                  
                </div>
                <div style="margin-top:2em;min-height:15em;"
                class="ui inverted segment">
                    <h3 style="text-align:center;">Contract's output zone</h3>
                    <div id="callOutput" style="text-align:center;"></div>
                </div>`;
            $('#modalCheck').find('.content').html($modalContent);

            // ### Modal buttons ###
            // getInit Call
            $('#modalCheck').on('click','#getInit', function(){
                $('#callOutput').empty();
                if (!ajaxBlocker){
                    ajaxBlocker = true;
                    $.ajax({
                        type: 'GET',
                        url: '/callContract',
                        data: {
                            abi: contracts[absIndex][2],
                            address: contracts[absIndex][3],
                            func: 'getInit',
                            account: getAccount()
                        },
                        success: function(_datas){
                            $.each(_datas,function(i,_data){
                                switch(i){
                                    case 0:
                                        i = 'Sender Address';
                                        _data = `${_data} `+$logo;
                                        break;
                                    case 1:
                                        i = 'Contract\'s account balance';
                                        break;
                                    case 2:
                                        i = 'Contract\'s creation time';
                                        _data = formatTime(_data);
                                        break;
                                    case 3:
                                        i = 'Contract\'s ending time (not operational)';
                                        _data = formatTime(_data);
                                        break;
                                    case 4:
                                        i = 'Cryptographically signed creation time';
                                        break;
                                }
                                $('#callOutput').append(`
                                    <p><strong>${i}:</strong> <span style="color:cyan;">${_data}</span></p>`
                                );
                            });
                        }
                    });
                }
            });

            // getConsent Call
            $('#modalCheck').on('click','#getConsent', function(){
                $('#callOutput').empty();
                if (!ajaxBlocker){
                    ajaxBlocker = true;
                    $.ajax({
                        type: 'GET',
                        url: '/callContract',
                        data: {
                            abi: contracts[absIndex][2],
                            address: contracts[absIndex][3],
                            func: 'getConsent',
                            account: getAccount()
                        },
                        success: function(_datas){
                            ajaxBlocker = false;
                            $.each(_datas,function(i,_data){
                                switch(i){
                                    case 0:
                                        i = 'Acceptant\'s Address';
                                        break;
                                    case 1:
                                        i = 'Accepted time';
                                        _data = formatTime(_data);
                                        break;
                                    case 2:
                                        i = 'Cryptographically signed accepted time';
                                        break;
                                    case 3:
                                        i = 'Message of the Acceptant';
                                        break;
                                }
                                $('#callOutput').append(`
                                    <p><strong>${i}:</strong> <span style="color:cyan;">${_data}</span></p>`
                                );
                            });
                        }
                    });
                }
            });

            // getInvoice Call
            $('#modalCheck').on('click','#getInvoice', function(){
                $('#callOutput').empty();
                if (!ajaxBlocker){
                    ajaxBlocker = true;
                    $.ajax({
                        type: 'GET',
                        url: '/callContract',
                        data: {
                            abi: contracts[absIndex][2],
                            address: contracts[absIndex][3],
                            func: 'getInvoice',
                            account: getAccount()
                        },
                        success: function(_datas){
                            ajaxBlocker = false;
                            $.each(_datas,function(i,_data){
                                switch(i){
                                    case 0:
                                        i = 'Message inside the Invoice';
                                        break;
                                    case 1:
                                        i = 'Product of the Invoice';
                                        break;
                                    case 2:
                                        i = 'Amount to pay';
                                        break;
                                    case 3:
                                        i = 'Invoice limit Date';
                                        break;
                                    case 4:
                                        i = 'Invoice paid?';
                                        break;
                                }
                                $('#callOutput').append(`
                                    <p><strong>${i}:</strong> <span style="color:cyan;">${_data}</span></p>`
                                );
                            });
                        }
                    });
                }
            });
        }
        $('#modalCheck').modal('show');
    });





    // ### Contract runs ###
    $('tbody').on('click','.changeInfo',function(){
        // Cache the clicked contract's id from table
        var $cId = parseInt($(this).parent().prev().prev().html());
        var $logo = $(this).parent().next().next().html();
        // Cache the clicked contract's name from table
        var $cName = $(this).parent().prev().html();
        // Fill the modal head with contract's name
        $('#modalCheck').find('.header').html($cName);
        var absIndex = findId(contracts,$cId);
        $('#modalCheck .header .content').off();

        if ($cName === "EscrowContract") {
            var $modalContent = `
                <div style="text-align:center;">
                    <p>Contract's address: ${contracts[absIndex][3]}</p>
                    <p>Last update time: ${formatTime(contracts[absIndex][4])}</p>
                </div>
                <div style="text-align:center;margin-top:2em;">
                    <h4>Change Contract's State</h4>
                    <button id="acceptContract" class="ui secondary negative button">Accept Contract</button>
                    <button id="setDeposit" class="ui secondary negative button">Set Deposit</button>
                    <button id="withdraw" class="ui secondary negative button">Withraw</button>
                    <button id="withdrawAll" class="ui secondary negative button">Withraw All</button>
                   
                </div>
                <div style="margin-top:2em;min-height:18em;"
                class="ui inverted segment">
                    <h3 style="text-align:center;">Contract's output zone</h3>
                    <div id="callOutput" style="text-align:center;"></div>
                </div>
            `;
            $('#modalCheck').find('.content').html($modalContent);


            // ### Modal buttons ###
            $('#modalCheck').on('click','#acceptContract',function(){
                var $input = `
                <form class="ui form">
                    <div class="field">
                        <label style="color:white;">Consent Message</label>
                        <input type="text" placeholder="Enter here your message to provide with your consent">
                    </div>
                </form>
                <button id="submit_setConsent" class="ui button primary positive">Submit</button>`;
                $('#modalCheck').find('#callOutput').html($input);
            });

            $('#modalCheck').on('click','#setDeposit',function(){
                var $input = `
                <form class="ui form">
                    <div class="field">
                        <label style="color:white;">Amount to deposit in the contract</label>
                        <input type="number" placeholder="Enter here your desired deposit">
                    </div>
                </form>
                <button id="submit_setDeposit" class="ui button primary positive">Submit</button>`;
                $('#modalCheck').find('#callOutput').html($input);
            });

            $('#modalCheck').on('click','#withdraw',function(){
                var $input = `
                <form class="ui form">
                    <div class="field">
                        <label style="color:white;">Amount to withdraw from contract</label>
                        <input type="number" placeholder="Enter here your desired withdraw">
                    </div>
                </form>
                <button id="submit_withdraw" class="ui button primary positive">Submit</button>`;
                $('#modalCheck').find('#callOutput').html($input);
            });

            $('#modalCheck').on('click','#withdrawAll',function(){
                var $input = `
                <form class="ui form">
                    <div class="field">
                        <label style="color:white;">Press Submit to withdraw everything from the contract</label>
                    </div>
                </form>
                <button id="submit_withdrawAll" class="ui button primary positive">Submit</button>`;
                $('#modalCheck').find('#callOutput').html($input);
            });





            // acceptContract RUN
            $('#callOutput').on('click','#submit_setConsent',function(){
                var userInput = $('#callOutput input').val();
                $('#callOutput').html(`
                        <div class="ui icon message" style="margin-top:3em">
                          <i class="notched circle loading icon"></i>
                          <div class="content">
                            <div class="header">
                              Loading
                            </div>
                            <p>Submitting transaction...</p>
                          </div>
                        </div>`
                );
                if (!ajaxBlocker){
                    ajaxBlocker = true;
                    $.ajax({
                        type: 'GET',
                        url: '/runContract',
                        data: {
                            abi: contracts[absIndex][2],
                            address: contracts[absIndex][3],
                            func: 'acceptContract',
                            arg: userInput,
                            payable: 0,
                            account: getAccount()
                        },
                        success: function(_datas){
                            ajaxBlocker = false;
                            $('#callOutput').html(`d
                                <div class="ui steps">
                                  <div class="completed step">
                                    <i class="payment icon"></i>
                                    <div class="content">
                                      <div class="title">Deployed</div>
                                      <div class="description">Mined and deployed</div>
                                    </div>
                                  </div>
                                </div>`);
                        }
                    });
                }
            });

            // setDeposit RUN
            $('#callOutput').on('click','#submit_setDeposit',function(){
                var userInput = $('#callOutput input').val();
                $('#callOutput').html(`
                        <div class="ui icon message" style="margin-top:3em">
                          <i class="notched circle loading icon"></i>
                          <div class="content">
                            <div class="header">
                              Loading
                            </div>
                            <p>Submitting transaction...</p>
                          </div>
                        </div>`
                );
                if (!ajaxBlocker){
                    ajaxBlocker = true;
                    $.ajax({
                        type: 'GET',
                        url: '/runContract',
                        data: {
                            abi: contracts[absIndex][2],
                            address: contracts[absIndex][3],
                            func: 'setDeposit',
                            arg: '',
                            payable: userInput,
                            account: getAccount()
                        },
                        success: function(_datas){
                            ajaxBlocker = false;
                            $('#callOutput').html(`
                                <div class="ui steps">
                                  <div class="completed step">
                                    <i class="payment icon"></i>
                                    <div class="content">
                                      <div class="title">Deployed</div>
                                      <div class="description">Mined and deployed</div>
                                    </div>
                                  </div>
                                </div>`
                            );
                        }
                    });
                }
            });



            // withdraw RUN
            $('#callOutput').on('click','#submit_withdraw',function(){
                var userInput = $('#callOutput input').val();
                $('#callOutput').html(`
                        <div class="ui icon message" style="margin-top:3em">
                          <i class="notched circle loading icon"></i>
                          <div class="content">
                            <div class="header">
                              Loading
                            </div>
                            <p>Submitting transaction...</p>
                          </div>
                        </div>`
                );
                if (!ajaxBlocker){
                    ajaxBlocker = true;
                    $.ajax({
                        type: 'GET',
                        url: '/runContract',
                        data: {
                            abi: contracts[absIndex][2],
                            address: contracts[absIndex][3],
                            func: 'withdraw',
                            arg: userInput,
                            payable: 0,
                            account: getAccount()
                        },
                        success: function(_datas){
                            ajaxBlocker = false;
                            $('#callOutput').html(`
                                <div class="ui steps">
                                  <div class="completed step">
                                    <i class="payment icon"></i>
                                    <div class="content">
                                      <div class="title">Deployed</div>
                                      <div class="description">Mined and deployed</div>
                                    </div>
                                  </div>
                                </div>`
                            );
                        }
                    });
                }
            });


            // withdrawAll RUN
            $('#callOutput').on('click','#submit_withdrawAll',function(){
                $('#callOutput').html(`
                        <div class="ui icon message" style="margin-top:3em">
                          <i class="notched circle loading icon"></i>
                          <div class="content">
                            <div class="header">
                              Loading
                            </div>
                            <p>Submitting transaction...</p>
                          </div>
                        </div>`
                );
                if (!ajaxBlocker){
                    ajaxBlocker = true;
                    $.ajax({
                        type: 'GET',
                        url: '/runContract',
                        data: {
                            abi: contracts[absIndex][2],
                            address: contracts[absIndex][3],
                            func: 'withdrawAll',
                            arg: '',
                            payable: 0,
                            account: getAccount()
                        },
                        success: function(_datas){
                            ajaxBlocker = false;
                            $('#callOutput').html(`
                                <div class="ui steps">
                                  <div class="completed step">
                                    <i class="payment icon"></i>
                                    <div class="content">
                                      <div class="title">Deployed</div>
                                      <div class="description">Mined and deployed</div>
                                    </div>
                                  </div>
                                </div>`
                            );
                        }
                    });
                }
            });
        }
        else if ($cName === "InvoiceContract") {


            var $modalContent = `
                <div style="text-align:center;">
                    <p>Contract's address: ${contracts[absIndex][3]}</p>
                    <p>Last update time: ${formatTime(contracts[absIndex][4])}</p>
                </div>
                <div style="text-align:center;margin-top:2em;">
                    <h4>Show Information</h4>`
                    + isCanAccept(contracts[absIndex][5])
                    + isCanPay(contracts[absIndex][6]) +
                    `
                </div>
                <div style="margin-top:2em;min-height:18em;"
                class="ui inverted segment">
                    <h3 style="text-align:center;">Contract's output zone</h3>
                    <div id="callOutput" style="text-align:center;"></div>
                </div>`;
            $('#modalCheck').find('.content').html($modalContent);



            // ### Modal buttons ###
            $('#modalCheck').on('click','#acceptContract',function(){
                var $input = `
                <form class="ui form">
                    <div class="field">
                        <label style="color:white;">Consent Message</label>
                        <input type="text" placeholder="Enter here your message to provide with your consent">
                    </div>
                </form>
                <button id="submit_setConsent" class="ui button primary positive">Submit</button>`;
                $('#modalCheck').find('#callOutput').html($input);
            });

            // ### Modal buttons ###
            $('#modalCheck').on('click','#payInvoice',function(){
                var $input = `
                <form class="ui form">
                    <div class="field">
                        <label style="color:white;">Press Submit to pay as agreed in the Invoice.(the exact amount or more but not less!)</label>
                        <input type="number" placeholder="Enter here your message to provide with your consent">
                    </div>
                </form>
                <button id="submit_payInvoice" class="ui button primary positive">Submit</button>`;
                $('#modalCheck').find('#callOutput').html($input);
            });




            // acceptContract RUN
            $('#callOutput').on('click','#submit_setConsent',function(){
                var userInput = $('#callOutput input').val();
                $('#callOutput').html(`
                        <div class="ui icon message" style="margin-top:3em">
                          <i class="notched circle loading icon"></i>
                          <div class="content">
                            <div class="header">
                              Loading
                            </div>
                            <p>Submitting transaction...</p>
                          </div>
                        </div>`
                );
                if (!ajaxBlocker){
                    ajaxBlocker = true;
                    $.ajax({
                        type: 'GET',
                        url: '/runContract',
                        data: {
                            abi: contracts[absIndex][2],
                            address: contracts[absIndex][3],
                            func: 'acceptContract',
                            arg: userInput,
                            payable: 0,
                            account: getAccount()
                        },
                        success: function(_datas){
                            ajaxBlocker = false;
                            $('#callOutput').html(`
                                <div class="ui steps">
                                  <div class="completed step">
                                    <i class="payment icon"></i>
                                    <div class="content">
                                      <div class="title">Deployed</div>
                                      <div class="description">Mined and deployed</div>
                                    </div>
                                  </div>
                                </div>`
                            );
                        }
                    });
                }
            });


            // acceptContract RUN
            $('#callOutput').on('click','#submit_payInvoice',function(){
                var userInput = $('#callOutput input').val();
                $('#callOutput').html(`
                        <div class="ui icon message" style="margin-top:3em">
                          <i class="notched circle loading icon"></i>
                          <div class="content">
                            <div class="header">
                              Loading
                            </div>
                            <p>Submitting transaction...</p>
                          </div>
                        </div>`
                );
                if (!ajaxBlocker){
                    ajaxBlocker = true;
                    $.ajax({
                        type: 'GET',
                        url: '/runContract',
                        data: {
                            abi: contracts[absIndex][2],
                            address: contracts[absIndex][3],
                            func: 'payInvoice',
                            arg: '',
                            payable: userInput,
                            account: getAccount()
                        },
                        success: function(_datas){
                            ajaxBlocker = false;
                            $('#callOutput').html(`
                                <div class="ui steps">
                                  <div class="completed step">
                                    <i class="payment icon"></i>
                                    <div class="content">
                                      <div class="title">Deployed</div>
                                      <div class="description">Mined and deployed</div>
                                    </div>
                                  </div>
                                </div>`
                            );
                        }
                    });
                }
            });
        }



        $('#modalCheck').modal('show');
    }); // END Change Information buttons
}); // end jquery nested function

